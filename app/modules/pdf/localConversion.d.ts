/**
 * Opties van de Gotenberg Chromium module
 */
export type ChromiumOptions = {
  /** Dimensies van papier */
  paper?: {
    /** Papier breedte, in inches */
    width?: number
    /** Papier hoogte, in inches */
    height?: number
  }
  /** Margins */
  margin?: {
    /** Top margin, in inches */
    top?: number
    /** Right margin, in inches */
    right?: number
    /** Bottom margin, in inches */
    bottom?: number
    /** Left margin, in inches */
    left?: number
  }
  /** Print de achtergrond */
  printBackground?: boolean
  /** Orientatie van de pagina */
  orientation?: 'portrait' | 'landscape'
  /** Pagina scale */
  scale?: number
  /** Te emuleren media type */
  emulatedMediaType?: 'print' | 'screen'
}

/**
 * Opties van de Gotenberg Chromium module op de manier dat Gotenberg het aangeleverd
 * wilt krijgen.
 * @see {@link https://gotenberg.dev/docs/modules/chromium De Gotenberg Chromium module}
 */
export type ChromiumNormalizedOptions = {
  /** Papier breedte, in inches */
  paperWidth: string
  /** Papier hoogte, in inches */
  paperHeight: string
  /** Top margin, in inches */
  marginTop: string
  /** Right margin, in inches */
  marginRight: string
  /** Bottom margin, in inches */
  marginBottom: string
  /** Left margin, in inches */
  marginLeft: string
  /** Print de achtergrond */
  printBackground: 'true' | 'false'
  /** Zet de orientatie van de pagina op landscape */
  landscape: 'true' | 'false'
  /** Pagina scale */
  scale: string
  /** Te emuleren media type */
  emulatedMediaType: 'print' | 'screen'
}
