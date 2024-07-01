import fs from 'fs/promises'
import {existsSync, createWriteStream, mkdirSync} from 'node:fs'
import path from 'node:path'
import archiver from 'archiver';
import pino from 'pino'
import { getDocument, sendCallback, upload } from '../pdf/handler'
import {Request} from './request.d'

let serializeError = (e:Error): any => null;
import('serialize-error').then(serr => {
  serializeError = serr.serializeError;
});

const logger = pino()

/** @todo verwijderen van bestanden
 * Handler voor het verwerken van zip-bestanden.
 * @async
 * @param Request: API call van het verzoek
*/
export const handleRequest = async (request: Request)=>{
  try {
    logger.info(`${request.id} Starten met het samenstellen van de zip`)
    logger.info(`: received request ${JSON.stringify(request)}`)
    // Hoofdfolder en subfolder(s) worden gecreërd en documenten van het zip-bestand worden erin geplaatst
    const folder = await createfolder(request)
    // converteren naar zip
    logger.info(`${request.id} zippen van document`)
    // Functie voor het converteren van de hoofdfolder naar ZIP.
    const zipPath = await createZipFile(folder)
    // Lezen van het zip-bestand en return het als arraybuffer als dataformaat
    const zipdata = await readZipFile(zipPath)
    // uploaden van zip bestand
    await upload(request, zipdata)
    // Verwijderen van hoofdfolder met alle inhoud
    await fs.rm(path.join(__dirname, folder), { recursive: true, force: true })
    // Verwijderen van zip-bestand
    await fs.rm(zipPath)
  } catch (err) {
    if(existsSync(path.join(__dirname, request.id))) {
      await fs.rm(path.join(__dirname, request.id), { recursive: true, force: true })
    }
    if(existsSync(request.id + 'zip')){
      await fs.rm(request.id + 'zip')
    }
    if (err instanceof Error) logger.error(serializeError(err));
    await catchHandleRequest(request, err)
  }
}

/**
 * Hoofdfolder en subfolder(s) worden gecreërd en documenten van het zip-bestand worden erin geplaatst
 * @async
 * @param request API call van het verzoek
 * @returns Pad waar de hoofdfolder staat
 */
const createfolder = async (request: Request) => {
  logger.info(`${request.id} starten met opbouwen van de mappen`)
  // Naam van de hoofdfolder is het ID van het verzoek
  const folderNameStart = request.id

  // Als de hoofdfolder nog niet bestaat wordt deze aangemaakt, anders gebeurt er niets.
  if (!existsSync(path.join(__dirname, folderNameStart))) {
    await mkdirSync(path.join(__dirname, folderNameStart))
  }

  for(const document of request.input){
    // download document
    const sourceDocumentResponse = await getDocument(request.id, document.url, 'arraybuffer')
    const sourceDocument = sourceDocumentResponse.data
    logger.info(document.naam)
    const subfolders = document.naam.split("/").slice(0,-1).join("/")
    const folderName = request.id + "/" +  subfolders
    logger.info(`foldername: ${folderName}`)
    await CreateSubfolders(request.id, subfolders)
    const fileName = folderName + "/" + document.naam.split("/")[document.naam.split("/").length - 1]
    logger.info(`fileName: "  ${fileName}`)
    await fs.writeFile(path.join(__dirname, fileName), sourceDocument)
    logger.info(`bestand geschreven`)
  }
  return request.id
}

/**
 * Deze functie maakt de subfolders aan
 * @async
 * @param mainFolder Naam van de hoofdfolder
 * @param subFolders Naam van de subfolders
 */
async function CreateSubfolders(mainFolder:string, subFolders: string) {
  // Eerste deel van het pad
  let partialPath = mainFolder
  // Split alle subfolders van elkaar
  const subFoldersArray = subFolders.split("/")
  // Loop over de subfolders
  subFoldersArray.forEach(async (part: string) => {
    // Voeg de rest van het pad toe
    partialPath = partialPath + "/" + part
    logger.info(`path: ${partialPath}`)
    // Als de subfolder nog niet bestaat wordt deze aangemaakt, anders gebeurt er niets.
    if (!existsSync(path.join(__dirname,partialPath))) {
      await fs.mkdir(path.join(__dirname, partialPath),{recursive: true})
      logger.info("folder aangemaakt")
    }
 })
}

/**
 * Functie voor het converteren van de hoofdfolder naar ZIP.
 * @async
 * @param directoryPath: Path naar de hoofdfolder die uiteindelijk naar een zip veranderd moet worden.
 * @returns Pad naar het zip-bestand als het proces is geslaagd, anders een error
 */
async function createZipFile(directoryPath: string): Promise<string>{
  logger.info(`start de zip conversie`)
  // Pad waar het zip-bestand geplaatst wordt
  const outputFilePath = `${directoryPath}.zip`;
  const output = createWriteStream(outputFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise<string>((resolve, reject) => {
    // Als het proces slaagt:
    output.on('close', () => {
      // Resultaat van de functie: path waar de zip folder staat
      resolve(outputFilePath);
    });

    // Resultaat van de functie: error
    archive.on('error', (err: Error) => {
      reject(err);
    });

    // De hoofdfolder wordt in het zip-bestand geschreven
    archive.pipe(output);
    archive.directory(path.join(__dirname,directoryPath), false);
    archive.finalize();
    // Van de hoofdfolder is een zip gemaakt, de promise wordt nu afgesloten
  });
}

/**
 * Lezen van het zip-bestand en return het als arraybuffer als dataformaat
 * @param zipPath pad naar het zip-bestand
 * @returns Het hele zip-bestand als arraybuffer
 */
const readZipFile =async (zipPath:string) => {
  const filedata = await fs.readFile (zipPath)
  const arrayBuffer = filedata.buffer.slice(filedata.byteOffset,filedata.byteOffset + filedata.byteLength)
  return arrayBuffer
}

/**
 * Catch een error bij een PDF verzoek in de functie handleRequest
 * @async
 * @param request Het request
 * @param err Error object
 */
const catchHandleRequest = async (request: Request, err: unknown) => {
  logger.error(
    `${request.id}: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
  )
  try {
    await sendCallback(request.callback.status, err)
    logger.info(`${request.id}: sent error callback`)
  } catch (err) {
    logger.error(
      `${request.id}: error sending callback error: ${JSON.stringify(err)}`
    )
  }
}
