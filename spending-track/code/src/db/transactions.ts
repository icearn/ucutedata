import { getDb } from './index';
import * as Crypto from 'expo-crypto';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  location?: string;
  image?: string;
  isFavorite?: boolean;
}

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  const db = await getDb();
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO transactions (id, title, amount, category, date, location, image, isFavorite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, transaction.title, transaction.amount, transaction.category, transaction.date, transaction.location || null, transaction.image || null, transaction.isFavorite ? 1 : 0]
  );
  return id;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const db = await getDb();
  const result = await db.getAllAsync<any>('SELECT * FROM transactions ORDER BY date DESC');
  return result.map(row => ({
    ...row,
    isFavorite: !!row.isFavorite,
  }));
};

export const toggleFavorite = async (id: string, isFavorite: boolean) => {
  const db = await getDb();
  await db.runAsync('UPDATE transactions SET isFavorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
};
