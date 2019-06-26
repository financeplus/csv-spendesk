import * as interfaces from '../interfaces';
import { ISpendeskTransaction } from '../interfaces';

/**
 * handles a credit payment that doesn't need to be matched here
 */
export const preprocessPaymentArray = async (
  paymentArray: interfaces.ISpendeskTransaction[]
): Promise<interfaces.ISpendeskTransaction[]> => {
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
  }) as interfaces.ISpendeskTransaction[];
  paymentArray.forEach(payment => {
    if (payment.Credit) {
      payment.Type = 'Load';
      return false;
    } else if (payment.Description.startsWith('FX fee')) {
      payment.Type = 'FXfee';
      return false;
    } else {
      return true;
    }
  });
  return paymentArray;
};

/**
 * attaches simplified transactions
 */
export const attachSimplifiedTransactions = async (transactionArrayArg: ISpendeskTransaction[]): Promise<ISpendeskTransaction[]> => {
  return transactionArrayArg.map(payment => {
    payment.simplifiedTransaction = {
      accountId: 'spendesk',
      amount: (() => {
        switch (payment.Type) {
          case 'Payment':
          case 'FXfee':
            return -payment.Debit;
          case 'Load':
          case 'Credit':
            return payment.Credit;
          default:
            throw new Error('cannot determine payment type!');
        }
      })(),
      date: payment["Payment date"],
      description: payment.Description,
      id: null
    }
    return payment;
  })
};
