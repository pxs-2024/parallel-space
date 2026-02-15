import OpenAI from "openai";
// 配的WildCard代理，国内可以访问OpenAI的API
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL:"https://api.gptsapi.net/v1",
});