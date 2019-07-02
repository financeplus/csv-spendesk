import * as plugins from './csv-spendesk.plugins';
import * as helpers from './helpers';

import * as interfaces from './interfaces';

export class CsvSpendesk {
  // ========= STATIC ================
  /**
   * get the SpendeskData from an extracted direcotory
   * @param dirPath
   */
  public static async fromFile(filePath: string): Promise<CsvSpendesk> {
    const reresolvedPath = plugins.path.resolve(filePath);
    const fileString = plugins.smartfile.fs.toStringSync(reresolvedPath);
    const csvSpendesk = await CsvSpendesk.fromCsvString(fileString);
    return csvSpendesk;
  }

  /**
   * get the SpendeskData from an extracted direcotory
   * @param dirPath
   */
  public static async fromDir(dirPath: string): Promise<CsvSpendesk> {
    const foundFiles: string[] = await plugins.smartfile.fs.listFileTree(dirPath, '**/Spendesk*', true);
    
    if (foundFiles.length === 0) {
      throw new Error('no files found!');
    }

    const csvSpendesks: CsvSpendesk[] = [];

    for (const foundFile of foundFiles) {
      const fileString = plugins.smartfile.fs.toStringSync(plugins.path.resolve(foundFile));
      plugins.path.join(dirPath, foundFile);
      csvSpendesks.push(await this.fromFile(foundFile)) ;
    }

    let returnCsvSpendesk: CsvSpendesk;
    for (const csvSpendeskInstance of csvSpendesks) {
      if (!returnCsvSpendesk) {
        returnCsvSpendesk = csvSpendeskInstance;
      } else {
        await returnCsvSpendesk.concat(csvSpendeskInstance);
      }
    }
    return returnCsvSpendesk;
  }

  public static async fromCsvString(csvStringArg: string): Promise<CsvSpendesk> {
    // lets parse the data from the directory
    const csvInstance = await plugins.smartcsv.Csv.createCsvFromString(csvStringArg, {
      headers: true
    });

    // lets differentiate between payments and credits
    let payments: interfaces.ISpendeskTransaction[] = await csvInstance.exportAsObject();

    // lets preprocess those payments
    payments = await helpers.preprocessPaymentArray(payments);
    payments = await helpers.attachSimplifiedTransactions(payments);
    const csvSpendeskInstance = new CsvSpendesk(payments);
    return csvSpendeskInstance;
  }

  /**
   * get the SpendeskData from Spendesk.com
   * @param dirPath
   */
  public static async fromSpendeskCom(dirPath: string) {
    // TODO:
  }

  // ========= INSTANCE ================
  public origin: 'api' | 'file' | 'dir';
  public updateFunction: (fromTimeStamp: plugins.smarttime.TimeStamp, untilTimeStamp: plugins.smarttime.TimeStamp) => interfaces.ISpendeskTransaction[];
  public transactionArray: interfaces.ISpendeskTransaction[];

  constructor(transactionArrayArg: interfaces.ISpendeskTransaction[]) {
    this.transactionArray = transactionArrayArg;
  }

  /**
   * gets all transactions
   */
  public async getTransactions () {
    return this.transactionArray;
  }

  /**
   * gets all loads
   */
  public async getLoads() {
    return this.transactionArray.filter(payment => {
      return payment.Type === 'Load';
    });
  }
  
  public async getDebits() {
    return this.transactionArray.filter(payment => {
      return payment.Type === 'Payment';
    });
  };

  /**
   * concat this instance's transactions with those of another one
   */
  public async concat(csvSpendeskInstance: CsvSpendesk): Promise<CsvSpendesk> {
    this.transactionArray = this.transactionArray.concat(csvSpendeskInstance.transactionArray);
    return this;
  }
}
