import app from './app.ts';

const port = process.env.PORT ?? 4000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
