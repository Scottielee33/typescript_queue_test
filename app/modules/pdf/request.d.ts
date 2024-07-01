export interface RequestInput {
  /** Grootte van het te converteren document in bytes */
  size: number
  /** MIME type van het te converteren document */
  mimeType: string
  /** URL waar het te converteren document staat */
  url: string
  /** The media type to emulate, either "screen" or "print" */
  emulatedMediaType?: 'screen' | 'print'
}

export interface RequestOutput {
  /** Gewenst output resultaat als MIME type (momenteel ondersteunen we alleen PDF conversie, dus dit moet altijd `application/pdf` zijn) */
  type: string
  /** Gewenst output extension */
  extension: string
  /** Voorkeurs converteer methode  */
  conversionMethod?: 'native' | 'local'
  /** Orientatie van de PDF  */
  orientation?: 'portrait' | 'landscape'
  /** Geen PDF/A  */
  noPDFA?: boolean
  /** ondertekenen? */
  ondertekening?: boolean
  /** functieverbandnummer  */
  ondertekeningfnvb?: number
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
  input: RequestInput
  /** Output opties */
  output: RequestOutput
  /** Callback opties */
  callback: RequestCallback
  /** Prioriteit van document */
  priority?: number
  /** Id wordt gezet door ons en is daarom geen onderdeel van de API call  */
  id: string
  /** Extension wordt gezet door ons en is daarom geen onderdeel van de API call */
  extension: string | false
}
