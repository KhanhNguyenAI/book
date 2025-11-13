// Token storage trong memory (không lưu localStorage để bảo mật hơn)
// AT: Memory only
// RT: httpOnly cookie (tự động từ backend)

let accessToken = null;

export const tokenStorage = {
  // Access Token - Memory only
  setAccessToken(token) {
    accessToken = token;
    // Optional: Có thể lưu vào sessionStorage nếu muốn persist qua page reload
    // sessionStorage.setItem('token', token);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('token', token);
    }
  },

  getAccessToken() {
    // Ưu tiên lấy từ memory, nếu không có thì lấy từ sessionStorage
    if (accessToken) {
      return accessToken;
    }
    if (typeof sessionStorage !== 'undefined') {
      const token = sessionStorage.getItem('token');
      if (token) {
        accessToken = token;
        return token;
      }
    }
    return null;
  },

  removeAccessToken() {
    accessToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('token');
    }
  },

  // Kiểm tra token có hợp lệ không (chưa hết hạn)
  isTokenValid() {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      return !isExpired;
    } catch (error) {
      return false;
    }
  }
};

