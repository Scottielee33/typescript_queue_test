/** Response object */
export interface Response {
  /** De resultaatcode  */
  result: string
  /** Bevat de foutmelding, indien `result` gelijk is aan "FAIL". */
  error?: string
  /** Bevat de URL om het resultaatdocument te downloaden, indien `result` gelijk is aan `OK`, en bij het verzoek `s3compatible` niet gelijk is aan `true`. */
  url?: string
}
