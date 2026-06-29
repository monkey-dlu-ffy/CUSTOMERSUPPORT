import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

const getCustomers = async () => {
  const token = sessionStorage.getItem('token');

  console.log("TOKEN:", token); // temporary

  const response = await axios.get(
    `${API_URL}/customers`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export default {
  getCustomers
};