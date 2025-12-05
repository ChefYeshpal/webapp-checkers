# webapp-checkers

This is a project for week 14 of [siege](https://siege.hackclub.com), where the theme is `ANYTHING`!
I decided to make a checkers webapp, because my first project for siege was [chess](https://chefyeshpal.github.io/webapp-chess) and I thought, "what better way to end this journey than make another board game?
So here we have it folks, last week of siege, one last project, really good times.

## A list of thingies...

- [x] game-board
    - [x] centered
    - [x] 8x8, each box being 32x32px
    - [x] alternate checked pattern
- [x] game-pieces
    - [x] red and black
    - [x] king piece has different vibe
- [x] intro-screen
    - [x] choice picking for user
    - [x] determines what orientation the board is in
- [x] moves
    - [x] Have legal moves
    - [x] Have `chess.com` style thing that shows where player can move
    - [x] Have a red outline circle for something that the player can capture
- [x] an ai to play against
    - [x] variable difficulty?
    - [x] togglable
- [x] Custom board setup
    - Always square
    - Avilable after you play one game

## Tech stack

- Vanilla HTML + CSS for layout and styling (no frameworks, just vibes).
- Plain JavaScript for all the game logic and DOM wrangling.

## How the AI works

The lonely clanker now comes in three moods. After you pick the AI as your opponent you can choose how difficult the matchup should be:

- `easy`: pause of ~350ms and samples a uniformly random move from the legal pool. It obeys forced captures but performs no scoring.
- `medium`: pause of ~550ms and evaluates each move with a deterministic heuristic that gets a small ±0.05 delta to prevent identical playthroughs:
    - +10 for any capture, plus +6 if the captured piece is a king or +3 if it is a man (normal);
    - +5.5 for landing on the promotion row; otherwise +0.2 per square of forward progress toward that row;
    - +0.4 if the moving piece is already a king;
    - central columns receive up to +1 based on proximity to the board midpoint.
    All moves sharing the highest score form a candidate list, and one is chosen at random from that shortlist.
- `hard`: pause of ~750ms, applies the same heuristic (nice word you got there), and then performs a single-ply minimax pass: it does a  demo of every opponent reply using the current board rules, checks the resulting board state (kings=5, men=3, plus centrality and promotion-distance bonuses), and keeps the move whose worst reply still outputs the best score for itselffl. Positions with no opponent replies get an additional stability offset before selection.

Capture chain follow-ups reuse the same decision logic per difficulty with shorter delays (220/320/380ms). The AI only queues a move when it is its turn, follows mandatory captures, and always routes execution through the same scoring model so behavior stays normal across games.

