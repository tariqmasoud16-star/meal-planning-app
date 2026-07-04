// Photo-fetch pass only (npm run photos). Safe to re-run any time.
import { fetchPhotos } from "./fetch-photos";

fetchPhotos().catch((err) => {
  console.error(err);
  process.exit(1);
});
