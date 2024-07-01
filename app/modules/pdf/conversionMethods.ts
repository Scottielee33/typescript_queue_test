/** MIME types die zowel local (Gotenberg) als native (Microsoft) geconverteerd kunnen worden */
const localAndNative = [
  'application/epub+zip', // .epub
  'application/vnd.ms-powerpoint', // .ppt .pps .pot
  'application/msword', // .doc .dot
  'application/rtf', // .rtf
  'application/vnd.oasis.opendocument.presentation', // .fodp .odp
  'application/vnd.oasis.opendocument.spreadsheet', // .fods .ods
  'application/vnd.oasis.opendocument.text', // .fodt .odt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'image/tiff', // .tiff .tif
  'text/rtf', // .rtf
]

/** MIME types die alleen native (Microsoft) geconverteerd kunnen worden */
const onlyNative = [
  'application/vnd.ms-excel.sheet.macroenabled.12', // .xlsm
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow', // .ppsx
  'text/markdown', // .md .markdown
]

/** MIME types die alleen local (Gotenberg) geconverteerd kunnen worden */
const onlyLocal = [
  'application/vnd.dbf', // .dbf
  'application/postscript', // .eps .ai .ps
  'application/vnd.ms-excel', // .xls .xlm .xla .xlc .xlt .xlw
  'application/vnd.ms-powerpoint.template.macroenabled.12', // .potm
  'application/vnd.oasis.opendocument.graphics-template', // .otg
  'application/vnd.oasis.opendocument.graphics', // .fodg .odg
  'application/vnd.oasis.opendocument.spreadsheet-template', // .ots
  'application/vnd.oasis.opendocument.text-template', // .ott
  'application/vnd.stardivision.calc', // .sdc
  'application/vnd.stardivision.draw', // .sda
  'application/vnd.stardivision.impress', // .sdd
  'application/vnd.stardivision.writer', // .sdw
  'application/vnd.sun.xml.calc.template', // .stc
  'application/vnd.sun.xml.calc', // .sxc
  'application/vnd.sun.xml.draw', // .sxd
  'application/vnd.sun.xml.impress.template', // .sti
  'application/vnd.sun.xml.impress', // .sxi
  'application/vnd.sun.xml.writer.template', // .stw
  'application/vnd.sun.xml.writer', // .sxw
  'application/vnd.palm', // .pdb .pqa .oprc
  'application/x-bibtex', // .bib (Niet geregistreerd mime type bij IANA)
  'application/x-latex', // .ltx (Niet geregistreerd mime type bij IANA)
  'application/x-msmetafile', // .wmf .wmz .emf .emz
  'application/x-pilot', // .prc .pdb
  'application/x-pocket-excel', // .pxl (Niet geregistreerd mime type bij IANA)
  'application/x-pocket-word', // .psw (Niet geregistreerd mime type bij IANA)
  'application/x-shockwave-flash', // .swf
  'application/x-sylk', // .slk (Niet geregistreerd mime type bij IANA)
  'application/xml', // .xml .xsl .xsd .rng
  'chemical/x-pdb', // .pdb (Niet geregistreerd mime type bij IANA)
  'image/bmp', // .bmp .dib
  'image/emf', // .emf
  'image/gif', // .gif
  'image/jpeg', // .jpg .jpeg .jpe
  'image/png', // .png
  'image/svg+xml', // .svg .svgz
  'image/wmf', // .wmf
  'image/x-cmu-raster', // .ras
  'image/x-pcx', // .pcx
  'image/x-ms-bmp', // .bmp
  'image/x-portable-bitmap', // .pbm
  'image/x-portable-graymap', // .pgm
  'image/x-xpixmap', // .xpm
  'text/csv', // .csv
  'text/plain', // .txt .text .conf .def .list .log .in .ini
  'text/xml', // .xml
]

/** MIME types voor MSG conversie */
const msg = [
  'application/vnd.ms-outlook', // .msg
]

/** MIME types voor EML conversie */
const eml = [
  'message/rfc822', // .eml .mime
]

/** MIME types voor HTML conversie */
const html = [
  'application/xhtml+xml', // .xhtml .xht
  'text/html', // .html .htm .shtml
]

/** MIME types voor URI conversie */
const uri = ['text/x-uri']

/** MIME types voor PDF conversie */
const pdf = [
  'application/pdf', // .pdf
]

const images = [
  'image/bmp', // .bmp .dib
  'image/emf', // .emf
  'image/gif', // .gif
  'image/jpeg', // .jpg .jpeg .jpe
  'image/png', // .png
  'image/svg+xml', // .svg .svgz
  'image/wmf', // .wmf
  'image/x-cmu-raster', // .ras
  'image/x-pcx', // .pcx
  'image/x-ms-bmp', // .bmp
  'image/x-portable-bitmap', // .pbm
  'image/x-portable-graymap', // .pgm
  'image/x-xpixmap', // .xpm
  'image/tiff', // .tiff .tif
]

const xlsx = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]

/**
 * Voeg alle conversie methoden samen in één array
 * @param conversionMethods Object met alle conversie methoden
 * @returns Een array met alle conversie methoden
 */
const combineConversionMethods = (conversionMethods: {
  [key: string]: string[]
}) => {
  let allConversionMethods: string[] = []
  for (const key in conversionMethods) {
    allConversionMethods = allConversionMethods.concat(
      conversionMethods[key as keyof typeof conversionMethods]
    )
  }
  return allConversionMethods
}

/** Ondersteunde MIME types in array bij conversie methode */
export const conversionMethods = {
  localAndNative,
  onlyLocal,
  onlyNative,
  msg,
  eml,
  html,
  uri,
  pdf,
  images,
  xlsx,
}

/** Alle ondersteunde MIME types in één array */
export const allConversionMethods = combineConversionMethods(conversionMethods)
