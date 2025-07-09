function getDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDay()}T${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`
}

export class UploadData {
  name: string;
  files: File[];
  percent: number;
  analysis?: Analysis[]

  constructor(name: string, files: File[], percent: number, analysis?: Analysis[]) {
    this.name = name;
    this.files = files;
    this.percent = percent;
    this.analysis = analysis;
  }

  static new(campaign: string, files: File[]): UploadData {
    return new UploadData(
      getDateString() + "_" + campaign,
      files.toSorted((a, b) => b.name < a.name ? 1 : -1),
      0
    );
  }

  get number_pictures(): number {
    return this.files.length;
  }

  updateAnalysis(analysis: Analysis[]): UploadData {
    return new UploadData(this.name, this.files, this.percent, analysis);
  }

  updateProgress(percent: number): UploadData {
    return new UploadData(this.name, this.files, percent, this.analysis);
  }
}

export class Analysis {
  file: File;
  overExposed: Boolean;
  underExposed: Boolean;

  constructor(file: File, overExposed: Boolean, underExposed: Boolean) {
    this.file = file;
    this.overExposed = overExposed;
    this.underExposed = underExposed;
  }

  get ok(): Boolean {
    return !this.overExposed && !this.underExposed;
  }
}
