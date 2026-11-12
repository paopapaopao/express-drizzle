import express, { type Response } from 'express';

const app = express();

app.get('/', (_, res: Response) => {
  res.send('express-drizzle');
});

export default app;
