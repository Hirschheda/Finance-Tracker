import axios from "axios";

const API = axios.create({
  baseURL: "https://jt23dkziya.execute-api.us-east-2.amazonaws.com/",
});

export default API;