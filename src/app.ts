import express, { type Response } from 'express';

import recipesRouter from './routes/recipes.ts';

const app = express();

app.get('/', (_, res: Response) => {
  res.send('express-drizzle');
});

app.use('/recipes', recipesRouter);

export default app;
