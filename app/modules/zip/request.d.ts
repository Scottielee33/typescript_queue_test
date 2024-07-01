export interface RequestInput {
  /** Grootte van het te converteren document in bytes */
  size: number
  /** MIME type van het te converteren document */
  mimeType: string
  /** URL waar het te converteren document staat */
  url: string
  /** De naam van het bestand */
  naam: string
}

type RequestInputArray = RequestInput[]

export interface RequestOutput {
  /** Gewenst output resultaat als MIME type (momenteel ondersteunen we alleen PDF conversie, dus dit moet altijd `application/zip` zijn) */
  type: string
  /** Gewenst output extension altijd zip, wordt gezet door ons */
  extension: string
}

export interface RequestCallback {
  /** @todo */
  status: string
  /** @todo  */
  document?: string
  /** Document is S3 compatible  */
  s3Compatible?: boolean
}

/**  Request object */
export interface Request {
  /** Input opties */
  input: RequestInputArray
  /** Output opties */
  output: RequestOutput
  /** Callback opties */
  callback: RequestCallback
  /** Prioriteit van document */
  priority?: number
  /** Id wordt gezet door ons en is daarom geen onderdeel van de API call  */
  id: string
}
