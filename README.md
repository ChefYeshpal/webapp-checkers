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
- [x] an ai to play again
    - [x] variable difficulty?
    - [x] togglable
- [x] Custom board setup
    - Always square
    - Avilable after you play one game

## Tech stack

- Vanilla HTML + CSS for layout and styling (no frameworks, just vibes).
- Plain JavaScript for all the game logic and DOM wrangling.

## How the AI works

The lonely clanker now comes in three moods. After you pick the AI as your opponent you can choose how spicy the matchup should be:

- `easy` keeps things easy and has quick reactions and picks a completely random legal move. Expect plenty of blunders.
- `medium` slows down a bit and scores every option using a heuristic: captures are prized, kings are valued more, central control matters and pushing toward promotion rows is rewarded. The AI grabs one of the best-scoring moves (ties are broken at random, so it still feels a little human).
- `hard` takes a moment to think, simulates your most annoying moves, and picks the move that keeps the evaluation advantage. It uses the same heuristic as medium to judge boards but mixes in a shallow counter-move search so it avoids obvious traps.

Long capture chains reuse the same difficulty logic, with delay timings tuned per level so easy feels fast while hard goes slow (im so articulate with words).

