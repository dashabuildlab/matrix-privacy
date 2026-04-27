export const getItemAsync = async (key: string): Promise<string | null> => {
  try { return localStorage.getItem(key); } catch { return null; }
};
export const setItemAsync = async (key: string, value: string): Promise<void> => {
  try { localStorage.setItem(key, value); } catch {}
};
export const deleteItemAsync = async (key: string): Promise<void> => {
  try { localStorage.removeItem(key); } catch {}
};
