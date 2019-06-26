import * as plugins from '../csv-spendesk.plugins';

export interface ISpendeskTransaction {
  simplifiedTransaction?: plugins.tsclass.ITransaction;
  'Payment date': Date;
  'Settlement date': Date;
  Month: string;
  Payer: string;
  Team: string;
  Description: string;
  Supplier: string;
  'Expense account': string;
  'Payment method': string;
  Type: 'Load' | 'Credit' | 'Payment' | 'FXfee';
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