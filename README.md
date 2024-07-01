# @mozardbv/conversion-gateway

Mozard Conversion Gateway

- [Meld een bevinding](https://intranet.mozard.nl/mozard/!suite09.scherm1089?mWfr=367)
- [Verzoek nieuwe functionaliteit](https://intranet.mozard.nl/mozard/!suite09.scherm1089?mWfr=604&mDdv=990842)

## Inhoudsopgave

- [@mozardbv/conversion-gateway](#mozardbvconversion-gateway)
  - [Inhoudsopgave](#inhoudsopgave)
  - [Over dit project](#over-dit-project)
    - [Zie ook](#zie-ook)
  - [Aan de slag](#aan-de-slag)
    - [Versioneren](#versioneren)
    - [Installatie](#installatie)
  - [Sharepoint (Native conversie)](#sharepoint-native-conversie)
  - [Bijdragen](#bijdragen)
  - [Ontwikkelen](#ontwikkelen)
  - [Tests draaien](#tests-draaien)
    - [Linters](#linters)
    - [Tests](#tests)
  - [Auteurs](#auteurs)
  - [Licentie](#licentie)

## Over dit project

Mozard Conversion Gateway

### Zie ook

- [Gotenberg documentatie](https://www.gotenberg.dev)
- [Gotenberg Ghostscript](https://example.com)
- [IANA MIME type register](https://www.iana.org/assignments/media-types/media-types.xhtml)

## Aan de slag

```sh
cp .env.example .env.development
docker-compose up -d
```

### Versioneren

We volgen [SemVer](https://semver.org/lang/nl/) voor versionering.

```sh
x.y.z
```

- Commits van het type `fix` verhogen `z`.
- Commits van het type `feat` verhogen `y`.
- Breaking changes commits verhogen `x`.

### Installatie

Clone deze git repository:

```sh
git clone git@gitlab.com:MozardBV/conversion-gateway.git
```

Kopiëer environment var file, en pas eventueel aan naar wens:

```sh
cp .env.example .env
```

Draai Gotenberg en Gotenberg Ghostscript met Docker:

```sh
docker run --rm -p 4000:3000 gotenberg/gotenberg:7.7.2
docker run --rm -p 4001:3000 vrex141/gotenberg:7.4.2-ghostscript-v1.0.0
```

Start de ontwikkelserver of draai de applicatie met Docker en Docker Compose:

```sh
# Ontwikkelserver
npm run dev

# Docker + Docker Compose
docker-compose up -d
```

## Sharepoint (Native conversie)

Microsoft SharePoint wordt gebruikt voor bestandsconversies van Microsoft bestanden. Een Microsoft Automate-proces, ingesteld om elke zaterdagavond te draaien, maakt de SharePoint leeg. Dit schema kan worden aangepast via de [Microsoft Automate site](https://make.powerautomate.com/).

## Bijdragen

Zie
[CONTRIBUTING.md](https://gitlab.com/MozardBV/conversion-gateway/-/blob/main/CONTRIBUTING.md)
voor de inhoudelijke procesafspraken.

## Ontwikkelen

Clone de test server en start deze:

```sh
git clone git@gitlab.com:martendebruijn/pdf-test-file-server

cd pdf-test-file-server
npm run dev
cd ../
```

Zorg ervoor dat de conversion gateway in ontwikkel-modus staat, door `NODE_ENV`
in `.env` op "development" te zetten.

```sh
NODE_ENV=development
```

Start de ontwikkelserver:

```sh
npm run dev
```

Vervolgens kan de conversion gateway getest worden. Dit kan d.m.v. een request
te sturen naar de conversion gateway. Documenten die in
`pdf-test-file-server/src/input` staan, kunnen gestuurd worden naar de
conversion gateway. Wanneer de conversion gateway klaar is, zal de gemaakte PDF
in de map `./testOutput` staan. Request kunnen gestuurd worden m.b.v. een
programma als Postman:

- `POST http://localhost:3000/pdf`
- Stuur een JSON body mee:

```json
{
  "input": {
    "size": 1026736,
    "url": "http://localhost:8000/sample-docx.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  },
  "output": {
    "type": "application/pdf",
    "conversionMethod": "native"
  },
  "callback": {
    "status": "http://localhost:8000"
  }
}
```

## Tests draaien

### Linters

```sh
npm run lint # JS/TS linter
npm run lint:fix # Autofix autofixable linter warnings
```

### Tests

```sh
npm run test # Run alle tests en print de output in junit.xml
npm run test:unit # Integration tests (Lab)
npm run test:html # Run alle tests en print de output in unit-tests.html
```

## Auteurs

- **Marten de Bruijn (Mozard)** - _Maintainer_ -
  [martendebruijn](https://gitlab.com/martendebruijn)

Zie ook de lijst van
[contributors](https://gitlab.com/mozardbv/conversion-gateway/main) die hebben
bijgedragen aan dit project.

## Licentie

[SPDX](https://spdx.org/licenses/) license: `UNLICENSED`

Copyright (c) 2006-2023 Mozard B.V.

[Leveringsvoorwaarden](https://www.mozard.nl/mozard/!suite86.scherm0325?mPag=204&mLok=1)
