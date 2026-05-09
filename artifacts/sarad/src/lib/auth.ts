const TOKEN_KEY = "sarad_token";
const LIST_KEY = "sarad_list";

export const getAdminToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAdminLoggedIn = (): boolean => !!getAdminToken();

export const getMyList = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) || "[]");
  } catch {
    return [];
  }
};

export const addToList = (id: number) => {
  const list = getMyList();
  if (!list.includes(id)) {
    localStorage.setItem(LIST_KEY, JSON.stringify([...list, id]));
  }
};

export const removeFromList = (id: number) => {
  const list = getMyList().filter((i) => i !== id);
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
};

export const isInList = (id: number): boolean => getMyList().includes(id);

export const buildAuthHeaders = (): Record<string, string> => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
