import { Attachment, AddressObject } from 'mailparser'

// @TODO: je wilt dat dit of een ArrayBuffer teruggeeft of een {content, filename}
// ipv beide
export type ConvertedAttachment =
  | ArrayBuffer
  | { content: Buffer; filename: string }

/** Alle email headers als string, of als Date bij de date header */
export type NormalizedEmailHeaders = {
  /** Wie de email heeft gestuurd */
  from?: string
  /** Mens(sen) naar wie de mail naar toe gestuurd wordt */
  to?: string
  /** CC header */
  cc?: string
  /** BCC header */
  bcc?: string
  /**
   * De datum van wanneer de mail gestuurd is
   * @todo check of "Date" wel nodig is/gebruikt wordt
   */
  date?: Date | string
  /** Het onderwerp van de mail */
  subject?: string
}

/** Raw email headers */
export type EmailHeaders = {
  /** Wie de email heeft gestuurd */
  from?: string | AddressObject | undefined
  /** Mens(sen) naar wie de mail naar toe gestuurd wordt */
  to?: string | AddressObject | AddressObject[] | undefined
  /** CC header */
  cc?: string | AddressObject | AddressObject[] | undefined
  /** BCC header */
  bcc?: string | AddressObject | AddressObject[] | undefined
  /** De datum van wanneer de mail gestuurd is */
  date?: Date | string
  /** Het onderwerp van de mail */
  subject?: string
}

/** Object met header naam en de waarde ervan
 * @example
 * ```{ header: 'Van: ', value: 'john_doe@example.com' }```
 */
export type HeaderObject = {
  header: string
  value: string | Date | number
}

/** Geparsede eml */
export type ParsedEml = {
  /** Mail als text */
  text: string | undefined;
  /** Mail als HTML */
  html: string | undefined
  /** Headers van de mail */
  headers: {
    /** BCC mail header */
    bcc: string | AddressObject | AddressObject[] | undefined
    /** CC mail header */
    cc: string | AddressObject | AddressObject[] | undefined
    /** Date mail header */
    date: string | Date | undefined
    /** From mail header */
    from: string | AddressObject | undefined
    /** Geparsede eml */
    subject: string | undefined
    /** Geparsede eml */
    to: string | AddressObject | AddressObject[] | undefined
  }
  /** Geparsede eml */
  attachments: Attachment[]
}

/** Geparsede eml */
export type ParsedMsg = {
  /** Mail als text */
  text: string | undefined;
  /** Mail als HTML */
  html: string | undefined
  /** Headers van de mail */
  headers: {
    /** BCC mail header */
    bcc: string | AddressObject | AddressObject[] | undefined
    /** CC mail header */
    cc: string | AddressObject | AddressObject[] | undefined
    /** Date mail header */
    date: string | Date | undefined
    /** From mail header */
    from: string | AddressObject | undefined
    /** Geparsede eml */
    subject: string | undefined
    /** Geparsede eml */
    to: string | AddressObject | AddressObject[] | undefined
  }
  /** Geparsede eml */
  attachments: Attachment[]
  inlineAttachments: Attachment[]
}
