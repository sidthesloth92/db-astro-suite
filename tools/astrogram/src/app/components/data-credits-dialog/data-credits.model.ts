/** A license named in the Data credits dialog, with a link to its text. */
export interface DataCreditLicense {
  /** Short license name, e.g. "CC BY-SA 4.0". */
  readonly name: string;
  /** Link to the license text. */
  readonly url: string;
}

/** One third-party source credited in the Data credits dialog. */
export interface DataCredit {
  /** Source name, shown as the heading of the entry. */
  readonly name: string;
  /** What Astrogram uses the source for, in plain words. */
  readonly usedFor: string;
  /** Credit, citation or acknowledgement the source asks for, if any. */
  readonly credit?: string;
  /** The source's license, listed only where it is confirmed. */
  readonly license?: DataCreditLicense;
  /** Link to the source's home page. */
  readonly url?: string;
}

/** A titled group of credited sources. */
export interface DataCreditGroup {
  /** Group heading, e.g. "Plate solving". */
  readonly title: string;
  /** Sources in this group. */
  readonly credits: readonly DataCredit[];
}
