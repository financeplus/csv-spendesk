import * as plugins from '../csv-spendesk.plugins';

export type TAvailableCurrencies = 'EUR';
export type TPaymentState = 'Settled';

export interface ISpendeskOriginalTransaction {
  simpleTransaction: plugins.tsclass.ITransaction;
  original: any;
  'Payment date': string;
  'Settlement date': string;
  Month: string;
  Payer: string;
  Team: string;
  Description: string;
  Supplier: string;
  'Expense account': string;
  'Payment method': string;
  Type: string;
  // 'Local amount': number;
  // 'Local currency': 'EUR';
  Debit: string;
  Credit: string;
  Currency: string;
  VAT: string;
  vatPercentage?: string;
  State: string;
  'Receipt?': string;
  'Receipt name(s)': '';
}

export interface ISpendeskTransaction {
  simpleTransaction?: plugins.tsclass.ITransaction;
  original: ISpendeskOriginalTransaction;
  transactionHash: string;
  paymentDate: Date;
  settlementDate: Date;
  month: string;
  payer: string;
  team: string;
  description: string;
  supplier: string;
  expenseAccount: string;
  paymentMethod: string;
  paymentType: 'Load' | 'Credit' | 'Payment' | 'FXfee';
  // 'Local amount': number;
  // 'Local currency': 'EUR';
  amount: number;
  currency: TAvailableCurrencies;
  vatAmount: number;
  vatPercentage?: number;
  paymentState: TPaymentState;
  receiptAvailable: boolean;
  receiptNames: string[];
}
