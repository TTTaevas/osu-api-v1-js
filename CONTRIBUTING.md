If you feel like contributing to this project, then please, go ahead!

To get started with development, you should begin by forking this project and running `git clone` on your fork. After that's done, you should install all of its dependencies, add an API key to run tests with, and see if everything works as intended:

```bash
npm install # Add the package's dependencies using npm

# Rename the .env.example file to .env, and proceed with changing the value of `KEY` to your own key
# The standard way to obtain an API key is through the osu! website, specifically at https://osu.ppy.sh/home/account/edit#legacy-api

npm run test # Check that everything seems to be in order
```

`npm run test` is the command that compiles all of the files that are in `lib` into JavaScript and puts them in `dist`, to then run the generated `test.js` (from `test.ts`). It checks if all the important methods/functions work as intended, feel free to change all of its content while debugging!

If you open up a pull request, I *should* be able to get back to you and review/merge it relatively quickly, at least at the time of writing this.

Happy developing, and thank you for your interest in this project!
