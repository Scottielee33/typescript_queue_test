import { Stream } from 'stream'

/** Algemene properties van File object */
export interface FileObjectCommon {
  /** Request ID */
  id: string
  /** Naam van het bestand (met extensie) */
  name: string
  /** Grootte van het document */
  size: number
  /** Mime type van het document */
  mimeType: string
  /** Het media type, of "print" ofwel "screen" */
  emulatedMediaType?: 'print' | 'screen'
}

/** File object met een buffer als data */
export interface FileObjectBuffer extends FileObjectCommon {
  /** Document als buffer */
  data: Buffer
}

/** File object met een stream als data */
export interface FileObjectStream extends FileObjectCommon {
  /** Document als stream */
  data: Stream
}

/**
 * File object voor HTML
 * @todo vervang type unknown
 */
export interface FileObjectHTML extends FileObjectCommon {
  /** Document */
  data: unknown
}

/** File object met een base64 string als data
 * wordt momenteel niet gebruikt!
*/
export interface FileObjectBase64 extends FileObjectCommon {
  data: string
}
