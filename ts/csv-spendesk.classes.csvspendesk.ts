import * as plugins from './csv-spendesk.plugins';

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
    const foundFiles: string[] = await plugins.smartfile.fs.listFileTree(
      dirPath,
      '**/Spendesk*',
      true
    );

    if (foundFiles.length === 0) {
      throw new Error('no files found!');
    }

    const csvSpendesks: CsvSpendesk[] = [];

    for (const foundFile of foundFiles) {
      const fileString = plugins.smartfile.fs.toStringSync(plugins.path.resolve(foundFile));
      plugins.path.join(dirPath, foundFile);
      csvSpendesks.push(await this.fromFile(foundFile));
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
    const originalTransactionArray: interfaces.ISpendeskOriginalTransaction[] = (await csvInstance.exportAsObject()) as interfaces.ISpendeskOriginalTransaction[];
    const paymentsArray: interfaces.ISpendeskTransaction[] = [];
    for (const originalTransaction of originalTransactionArray) {
      const spendeskTransaction: interfaces.ISpendeskTransaction = {
        // the original transaction
        original: originalTransaction,

        // assigned later
        paymentType: null,
        amount: null,
        simpleTransaction: null,
        transactionHash: null,

        // assigned now
        currency: originalTransaction.Currency as interfaces.TAvailableCurrencies,
        description: originalTransaction.Description,
        expenseAccount: originalTransaction['Expense account'],
        month: originalTransaction.Month,
        payer: originalTransaction.Payer,
        paymentDate: new Date(originalTransaction['Payment date']),
        paymentMethod: originalTransaction['Payment method'],
        paymentState: originalTransaction.State as interfaces.TPaymentState,
        settlementDate: new Date(originalTransaction['Settlement date']),
        receiptAvailable: (() => {
          if ((originalTransaction['Receipt?'] as any) === 'Yes') {
            return true;
          } else {
            return false;
          }
        })(),
        receiptNames: [],
        supplier: originalTransaction.Supplier,
        team: originalTransaction.Team,
        vatAmount: parseInt(originalTransaction.VAT, 10),
        vatPercentage: ((): number => {
          if (!originalTransaction.VAT || originalTransaction.VAT === '0') {
            return 0;
          } else {
            const vatAmount = parseInt(originalTransaction.VAT, 10);
            const debitAmount = parseInt(originalTransaction.Debit, 10);
            return Math.round((vatAmount / (debitAmount - vatAmount)) * 100);
          }
        })()
      };

      // type
      spendeskTransaction.paymentType = (() => {
        if (spendeskTransaction.original.Credit !== '0') {
          return 'Load';
        } else if (spendeskTransaction.original.Debit !== '0') {
          return 'Payment';
        } else if (spendeskTransaction.original.Description.startsWith('FX fee')) {
          return 'FXfee';
        }
      })();

      // amount
      spendeskTransaction.amount = (() => {
        switch (originalTransaction.Type) {
          case 'Payment':
          case 'FXfee':
            return -parseInt(originalTransaction.Debit, 10);
          case 'Load':
          case 'Credit':
            return parseInt(originalTransaction.Credit, 10);
          default:
            throw new Error('cannot determine payment amount by type!');
        }
      })();

      // transaction hash
      spendeskTransaction.transactionHash = await plugins.smarthash.sha265FromObject({
        amount: spendeskTransaction.amount,
        transactionDate: spendeskTransaction.paymentDate,
        settlementDate: spendeskTransaction.settlementDate,
        supplier: spendeskTransaction.supplier,

      });

      // simple transaction
      spendeskTransaction.simpleTransaction = {
        accountId: null,
        id: spendeskTransaction.transactionHash,
        amount: spendeskTransaction.amount,
        date: spendeskTransaction.settlementDate,
        description: spendeskTransaction.description
      };
      paymentsArray.push(spendeskTransaction);
    }

    const csvSpendeskInstance = new CsvSpendesk(paymentsArray);
    return csvSpendeskInstance;
  }

  /**
   * get the SpendeskData from Spendesk.com
   * @param dirPath
   */
  public static async fromSpendeskCom(dirPath: string) {
    // TODO: implement spendesk API
    throw new Error(`method is not yet implemented`);
  }

  // ========= INSTANCE ================
  public origin: 'api' | 'file' | 'dir';
  public updateFunction: (
    fromTimeStamp: plugins.smarttime.TimeStamp,
    untilTimeStamp: plugins.smarttime.TimeStamp
  ) => interfaces.ISpendeskTransaction[];
  public transactionArray: interfaces.ISpendeskTransaction[];

  constructor(transactionArrayArg: interfaces.ISpendeskTransaction[]) {
    this.transactionArray = transactionArrayArg;
  }

  /**
   * gets all transactions
   */
  public async getTransactions() {
    return this.transactionArray;
  }

  /**
   * gets all loads
   */
  public async getLoads() {
    return this.transactionArray.filter(payment => {
      return payment.paymentType === 'Load';
    });
  }

  public async getDebits() {
    return this.transactionArray.filter(payment => {
      return payment.paymentType === 'Payment';
    });
  }

  /**
   * concat this instance's transactions with those of another one
   */
  public async concat(csvSpendeskInstance: CsvSpendesk): Promise<CsvSpendesk> {
    this.transactionArray = this.transactionArray.concat(csvSpendeskInstance.transactionArray);
    return this;
  }
}
