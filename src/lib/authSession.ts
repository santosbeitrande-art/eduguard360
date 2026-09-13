export const clearAuthSession = () => {
  const keys = [
    'currentUser',
    'eduguard_user',
    'eduguard_token',
    'token',
    'user',
    'auth_token',
    'accessToken',
    'building360.resident.tickets.v1',
  ];

  keys.forEach((key) => localStorage.removeItem(key));
};
