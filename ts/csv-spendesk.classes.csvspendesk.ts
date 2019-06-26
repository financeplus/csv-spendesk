import * as plugins from './csv-spendesk.plugins';

export interface IPayment {
  'Payment date': Date;
  'Settlement date': Date;
  Month: string;
  Payer: string;
  Team: string;
  Description: string;
  Supplier: string;
  'Expense account': string;
  'Payment method': string;
  Type: 'Load' | 'Payment' | 'FXfee';
  // 'Local amount': number;
  // 'Local currency': 'EUR';
  Debit: number;
  Credit: number;
  Currency: 'EUR';
  VAT: number;
  vatPercentage?: number;
  State: 'Settled';
  'Receipt?': boolean;
  'Receipt name(s)': '';
}

export class CsvSpendesk {
  // ========= STATIC ================
  /**
   * get the SpendeskData from an extracted direcotory
   * @param dirPath
   */
  public static async fromDir(dirPath: string, sevdeskToken: string) {
    const spendeskParser = new CsvSpendesk(dirPath, sevdeskToken);
    return spendeskParser;
  }

  /**
   * get the SpendeskData from Spendesk.com
   * @param dirPath
   */
  public static async fromSpendeskCom(dirPath: string) {
    // TODO:
  }

  // ========= INSTANCE ================
  public csvString: string;

  constructor() {
  }

  /**
   * creates matches
   */
  async parse(supplierMapArg: SupplierMap) {
    // lets parse the data from the directory
    const csvInstance = await plugins.smartcsv.Csv.createCsvFromString(this.csvString, {
      headers: true
    });

    // lets differentiate between payments and credits
    let credits: IPayment[];
    let fxFees: IPayment[];
    let payments: IPayment[] = await csvInstance.exportAsObject();
    ({ credits, fxFees, payments } = await this.preprocessPaymentArray(payments));

    // lets handle the credits and fxFees as they don't need further processing
    await this.handleCredits(credits);
    await this.handleFxFees(fxFees);
  }

  /**
   * handles a credit payment that doesn't need to be matched here
   */
  private async preprocessPaymentArray(
    paymentArray: IPayment[]
  ): Promise<{
    credits: IPayment[];
    fxFees: IPayment[];
    payments: IPayment[];
  }> {
    paymentArray = paymentArray.map(paymentCsvObject => {
      paymentCsvObject['Payment date'] = new Date(paymentCsvObject['Payment date']);
      paymentCsvObject['Settlement date'] = new Date(paymentCsvObject['Settlement date']);
      paymentCsvObject.Credit = parseFloat(paymentCsvObject.Credit as any);
      paymentCsvObject.Debit = parseFloat(paymentCsvObject.Debit as any);
      paymentCsvObject.VAT = parseFloat(paymentCsvObject.VAT as any);
      paymentCsvObject.vatPercentage = ((): number => {
        if (!paymentCsvObject.VAT || paymentCsvObject.VAT === 0) {
          return 0;
        } else {
          return Math.round(
            (paymentCsvObject.VAT / (paymentCsvObject.Debit - paymentCsvObject.VAT)) * 100
          );
        }
      })();
      paymentCsvObject['Receipt?'] = (() => {
        if ((paymentCsvObject['Receipt?'] as any) === 'Yes') {
          return true;
        } else {
          return false;
        }
      })();
      return paymentCsvObject;
    }) as IPayment[];
    const creditArray: IPayment[] = [];
    const fxArray: IPayment[] = [];
    paymentArray = paymentArray.filter(payment => {
      if (payment.Credit) {
        creditArray.push(payment);
        return false;
      } else if (payment.Description.startsWith('FX fee')) {
        fxArray.push(payment);
        return false;
      } else {
        return true;
      }
    });
    return {
      credits: creditArray,
      fxFees: fxArray,
      payments: paymentArray
    };
  }

  /**
   * handles credits
   */
  private async handleCredits(creditArray: IPayment[]): Promise<void> {
    for (const credit of creditArray) {
      const sevdeskTransactionForCreditLoad = new SevdeskTransaction({
        amount: credit.Credit,
        sevdeskCheckingAccountId: (await this.sevdeskParser.getSevdeskCheckingAccountByName(
          'Spendesk'
        )).sevdeskId,
        payeeName: 'Lossless GmbH',
        date: credit['Settlement date'],
        description: 'Account load by wire transfer or credit card',
        status: 'unpaid'
      });
      await sevdeskTransactionForCreditLoad.save(this.sevdeskParser.sevdeskAccount);
    }
  }

  /**
   * handles FX fees
   */
  private async handleFxFees(fxFeeArray: IPayment[]): Promise<void> {
    for (const fxFee of fxFeeArray) {
      const sevdeskTransactionForCreditLoad = new SevdeskTransaction({
        amount: -fxFee.Debit,
        sevdeskCheckingAccountId: (await this.sevdeskParser.getSevdeskCheckingAccountByName(
          'Spendesk'
        )).sevdeskId,
        payeeName: 'Spendesk',
        date: fxFee['Settlement date'],
        description: fxFee.Description,
        status: 'unpaid'
      });
      await sevdeskTransactionForCreditLoad.save(this.sevdeskParser.sevdeskAccount);
    }
  }
}
