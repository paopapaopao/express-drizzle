import express, { type Response } from 'express';

import { recipesRouter } from './routers/index.ts';

const app = express();

app.use(express.json());

app.get('/', (_, res: Response) => {
  res.send('express-drizzle');
});

app.use('/recipes', recipesRouter);

export default app;
