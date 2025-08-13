function getDateString() {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // month is 0-based
  const day = String(now.getDate()).padStart(2, '0'); // day of month
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
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

async function sleep(milliSeconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliSeconds));
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
}


export async function openDB() {
  const db = await self.indexedDB.open("auth-db", 1);

  return new Promise<IDBDatabase>((resolve, reject) => {
    db.onupgradeneeded = () => {
      const store = db.result.createObjectStore("auth");
    };
    db.onsuccess = () => resolve(db.result);
    db.onerror = () => reject(db.error);
  });
};

export async function getFromStore(store: IDBObjectStore, key: IDBValidKey) {
  const request = store.get(key)
  return await new Promise<string>((resolve, reject) => {
    request.onsuccess = (res) => resolve(request.result);
    request.onerror = (err) => reject(err);
  })
}


export interface Credentials {
    accessKeyId: string
    secretAccessKey: string
}