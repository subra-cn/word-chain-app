# word-chain-app
Helps Solve NYT Letter Boxed Puzzle

Run this app from https://subra-cn.github.io/word-chain-app/

Project Structure
word-chain-app/
├── index.html   # main HTML file with form and container elements
├── style.css    # styling for layout and components
├── script.js    # core logic: fetch dictionary, filter words, greedy algorithm
└── README.md    # this file

Running locally

You can run the app locally by simply opening index.html in your browser. There are no dependencies beyond a modern browser with Fetch support.
	1.	Clone or extract the repository.
	2.	Open index.html in Chrome, Firefox, Edge, or Safari.
	3.	Enter four three‑letter groups (e.g. ABC, DEF, GHI, JKL). Click Generate Words.
	4.	The first time you run it, the app downloads the dictionary. Large dictionary fetches can take a few seconds; progress is indicated.

Algorithm details

The app builds a mapping from each letter to its group index (0–3). It filters the dictionary as follows:
	1.	Words must consist entirely of letters from the four groups; any other letters disqualify the word.
	2.	No word may have adjacent characters from the same group.

After filtering, the words are sorted by how many distinct letters they cover and by length. The app maintains a set of uncovered letters and greedily selects the word that maximally reduces this set, chaining on last→first letter when possible. If no chainable word covers new letters, it selects the first chainable word. The process stops when all letters are covered or no additional chainable words exist.

Deploying to GitHub Pages

GitHub Pages can publish any static website. According to the GitHub Docs, you can create a dedicated repository or choose an existing one for your site, and you can configure a publishing source if your repo contains other files. To deploy this app:
	1.	Create or choose a repository. If you want a user/organization site, name it <username>.github.io; otherwise, pick any name.
	2.	Add the files. Copy index.html, style.css, script.js, and this README.md into the repository root (or a /docs folder if you prefer). Commit and push them.
	3.	Configure Pages. Navigate to Settings → Pages in your repo. Select the branch and folder (e.g. main and / or /docs) as the publishing source. GitHub Pages builds the site and looks for an index.html entry file.
	4.	Publish. Save your settings. GitHub Actions will build and deploy your site. You can view it at https://<username>.github.io/<repo>/ (or https://<username>.github.io/ for user/organization sites). Changes can take up to ten minutes to appear.

License

This project uses the words_alpha.txt word list, which is licensed as CC0.

Code in this repository is MIT licensed – feel free to adapt it for your own educational or word‑game‑building adventures. If you extend or improve the algorithm, please open a pull request!
