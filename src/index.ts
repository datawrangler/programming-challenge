/// <reference path="../typings/index.d.ts" />

import PIXI = require('pixi.js');
const renderer:PIXI.WebGLRenderer = new PIXI.WebGLRenderer(1280, 720);
document.body.appendChild(renderer.view);

// You need to create a root container that will hold the scene you want to draw.
const stage:PIXI.Container = new PIXI.Container();

const BoardMarginLeft:number = 512;
const BoardMarginTop:number = 20;
const CellSize:number = 16;

let boardGraphics:PIXI.Graphics = new PIXI.Graphics();

/*
// Declare a global variable for our sprite so that the animate function can access it.
let bunny:PIXI.Sprite = null;

// load the texture we need
PIXI.loader.add('bunny', 'images/bunny.jpeg').load(function (loader:PIXI.loaders.Loader, resources:any) {
    // This creates a texture from a 'bunny.png' image.
    bunny = new PIXI.Sprite(resources.bunny.texture);

    // Setup the position and scale of the bunny
    bunny.position.x = 400;
    bunny.position.y = 300;

    bunny.scale.x = 2;
    bunny.scale.y = 2;

    // Add the bunny to the scene we are building.
    stage.addChild(bunny);

    // kick off the animation loop (defined below)
    animate();
});

function animate() {
    // start the timer for the next animation loop
    requestAnimationFrame(animate);

    // each frame we spin the bunny around a bit
    bunny.rotation += 0.01;

    // this is the main render call that makes pixi draw your container and its children.
    renderer.render(stage);
}
*/

//////////////////////////////////////////////////

enum Direction {
  Up = 1,
  Down,
  Left,
  Right
}

////////////// Checkerboard //////////////////////

class Checkerboard {

  isDirty:boolean = false;

  private grid:CheckerboardCell[][];
  private cursorPosition:PIXI.Point = new PIXI.Point(-1, -1);

  constructor(numRows:number, numColumns:number) {
    const minSize:number = 3; // too simple
    const maxSize:number = 41;  // won't fit

    if (numRows >= minSize) {
      if (numColumns >= minSize) {
        if (numColumns <= maxSize) {
          if (numRows <= maxSize) {
            this.createBoard(numRows, numColumns);
          }
        }
      }
    } else {
      throw new Error("Lousy board size")
    }

  }

  get numRows():number {
    return this.grid.length;
  }

  get numColumns():number {
    return this.grid[0].length;
  }

  createBoard(numRows, numColumns):void {
    console.log("board creation time");
    this.grid = [[]];
    this.cursorPosition.x = this.cursorPosition.y = -1;
    for (let row = 0; row<numRows; row++) {
      this.grid[row] = [];
      for (let col = 0; col<numColumns; col++) {
        this.grid[row][col] = new CheckerboardCell();
      }
    }
    this.shuffleArrows();
  }

  shuffleArrows():void {
    for (let row = 0; row<this.numRows; row++) {
      for (let col = 0; col<this.numColumns; col++) {
        let cell = this.grid[row][col];
        let dir:Direction = randomDirection();
        cell.pointerDirection = dir;
        // cell.next = this.getNext(row, col, dir);
        let nextPosition:PIXI.Point = this.findNext(row, col, dir);
        if (null != nextPosition) {
          cell.next = this.getCell(nextPosition.y, nextPosition.x);
        }
      }
    }
    console.log("shuffleArrows() sets isDirty");
    this.isDirty = true;
  }

  advanceCursor():void {
    if (this.cursorPosition.x < 0) {
      return; // no cursor, no go
    }
    if (!hasEnded) {
      let currentCell:CheckerboardCell = this.getCell(this.cursorPosition.y, this.cursorPosition.x);
      let nextPosition:PIXI.Point = this.findNext(this.cursorPosition.y, this.cursorPosition.x, currentCell.pointerDirection);
      if (null != nextPosition) {
        let nextCell:CheckerboardCell = this.getCell(nextPosition.y, nextPosition.x);
        if (!nextCell.visited) {
          this.occupyCell(nextPosition.y, nextPosition.x);
          currentCell.occupied = false;
        } else {
          hasEnded = true;
          isRunning = false;
          sounds["tbone"].play();
        }
      } else {
        hasEnded = true;
        isRunning = false;
        sounds["tada"].play();
      }
    }
  }

  occupyCell(row:number, col:number):void {
    sounds["wetfoot"].play();
    let theCell:CheckerboardCell = this.getCell(row, col);
    theCell.occupied = theCell.visited = true;
    this.isDirty = true;
    // this.cursorPosition = theCell;
    this.cursorPosition.x = col;
    this.cursorPosition.y = row;
  }

  getCell(row:number, col:number):CheckerboardCell {
    return this.grid[row][col];
  }

  private findNext(row:number, col:number, dir:Direction):PIXI.Point {
    let nextPosition:PIXI.Point;
    switch(dir) {
      case Direction.Up:
        if (row > 0) {
          nextPosition = new PIXI.Point(col, row-1)
        }
        break;
      case Direction.Right:
        if (col < this.numColumns-1) {
          nextPosition = new PIXI.Point(col+1, row);
        }
        break;
      case Direction.Down:
        if (row < this.numRows-1) {
          nextPosition = new PIXI.Point(col, row+1);
        }
        break;
      case Direction.Left:
        if (col > 0) {
          nextPosition = new PIXI.Point(col-1, row);
        }
        break;
    }
    return nextPosition;
  }

  probe(row:number, col:number):boolean {
    return willLoop(this.grid[row][col]);
  }

}

//////////////////////////////////////////////////

interface LinkedList {
  next:LinkedList;
}

//////////////////////////////////////////////////

class CheckerboardCell implements LinkedList {
  next:LinkedList = null;
  pointerDirection: Direction;
  occupied:boolean = false;
  visited:boolean = false;
}

////////////////// utils /////////////////////////

function randomDirection():Direction {
  return randomInt(1,4) as Direction;
}

function randomInt(min:number, max:number):number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

//////////////// Floyd's algorithm ///////////////

function willLoop(firstCell:LinkedList):boolean {
  let result:boolean = false; // Optimism
  // empty lists do not loop
  if (null == firstCell) {
    return result;
  }

  let tortoise:LinkedList;
  let hare:LinkedList;

  tortoise = hare = firstCell;

  while (true) {
    tortoise = tortoise.next;
    // hare will move twice as fast as tortoise
    if (null == hare.next) {
      // we escaped, no loop found
      break;
    } else {
      hare = hare.next.next;
    }

    // did either hit the edge?
    if ((null == tortoise) || (null == hare)) {
      // we escaped
      break;
    }

    if (tortoise == hare) {
      // we looped!
      result = true;
      break;
    }
  }

  return result;
}

/////////////////// GUI //////////////////////////

let sounds = {};
let sprites = {};

function loadSprites():void {
  PIXI.loader
    .add("playBtn", "images/playBtn.png")
    .add("stopBtn", "images/stopBtn.png")
    .add("resetBtn", "images/resetBtn.png")
    .add("shuffleBtn", "images/shuffleBtn.png")
    .load(
      (loader, resources) => {
        // console.log("images added, res: " + resources);
        for (let prop in resources) {
          if (resources[prop].error) {
            console.log("Had a loading error: " + resources[prop].error);
            continue;
          }
          sprites[prop] = new PIXI.Sprite(resources[prop].texture);
          // console.log("property of " + prop + " is " + resources[prop]);
        }
        layoutUI();
      }
    )
}

function makeButton(name:string, x:number, y:number):PIXI.Sprite {
  let sprite:PIXI.Sprite = sprites[name];
  sprite.name = name;
  sprite.position.x = x;
  sprite.position.y = y;
  sprite.interactive = true;
  sprite.buttonMode = true;
  sprite.on("pointerdown", handleButtonPress);
  return sprite;
}

function layoutUI():void {
  const MarginLeft:number = 48;

  stage.addChild(makeButton("playBtn", MarginLeft, 20));
  stage.addChild(makeButton("stopBtn", MarginLeft, 160));
  stage.addChild(makeButton("resetBtn", MarginLeft, 300));
  stage.addChild(makeButton("shuffleBtn", MarginLeft, 440));

  updateCells();

  renderer.render(stage);
}

//////////////// Audio ///////////////////////////

function loadAudio():void {
  let audio = new Audio("sounds/tbone.ogg");
  audio.volume = 0.75;
  sounds["tbone"] = audio;

  audio = new Audio("sounds/wetfoot.ogg");
  audio.volume = 0.5;
  sounds["wetfoot"] = audio;

  audio = new Audio("sounds/click.ogg");
  audio.volume = 1.0;
  sounds["click"] = audio;

  audio = new Audio("sounds/tada.ogg");
  audio.volume = 1.0;
  sounds["tada"] = audio;
}

//////////////////////////////////////////////////

let isRunning:boolean = false;
let hasEnded:boolean = false;

//////////////////////////////////////////////////

console.log("And away we go");
loadAudio();
let board = new Checkerboard(41, 41);

initBoard(board);
loadSprites();

//drawBoard();
let heartbeatID:number = setInterval(drawBoard, 1000);

function handleButtonPress(e):void {
  sounds["click"].play();
  let target:PIXI.Sprite = e.target as PIXI.Sprite;
  switch (target.name) {
    case "playBtn":
      if (!isRunning) {
        seedBoard();
      }
      isRunning = true;
      break;
    case "stopBtn":
      isRunning = false;
      break;
    case "resetBtn":
      isRunning = false;
      hasEnded = false;
      boardGraphics.clear();
      console.log("dirty1? " + board.isDirty);
      board.createBoard(board.numRows, board.numColumns);
      console.log("dirty2? " + board.isDirty);
      renderer.render(stage);
      console.log("dirty3? " + board.isDirty);
      break;
    case "shuffleBtn":
      break;
    default:
      console.log("unhandled click on " + target.name);
      break;
  }
}

//////////////////////////////////////////////////

function seedBoard():void {
  const openBorderColor:number = 0x33cc33;
  const walledBorderColor:number = 0xcc3333;

  let seed:PIXI.Point = new PIXI.Point(randomInt(0,board.numRows-1), randomInt(0, board.numColumns-1));
  board.occupyCell(seed.x, seed.y);

  let hasLoop:boolean = board.probe(seed.x, seed.y);
  console.log("from " + seed.x + "," + seed.y + " we can " + (hasLoop ? "not" : "")+ " escape");
  // boardGraphics.beginFill(0x000000, 0.0);
  // boardGraphics.drawRect(0,0, CellSize * board.numColumns, CellSize * board.numRows);
}

function initBoard(board:Checkerboard):void {
  let numRows:number = board.numRows;
  let numColumns:number = board.numColumns;

  boardGraphics.position.set(BoardMarginLeft, BoardMarginTop);
  boardGraphics.lineStyle(1, 0xffffff, 1);
  boardGraphics.beginFill(0x666666, 1);
  stage.addChild(boardGraphics);
}

function updateCells():void {
  if (!board.isDirty) {
    console.log("no can update clean grid");
    return;
  }
  const normalCellColor:number = 0x666666;
  const occupiedCellColor:number = 0xcc33cc;
  const visitedCellColor:number = 0xcccc66;

  let penX:number = 0;
  let penY:number = 0;

  // console.log("board is " + board.numRows + " rows by " + board.numColumns + " cols");

  for (let row:number=0; row<board.numRows; row++) {
    penY = CellSize * row;

    for (let col:number=0; col<board.numColumns; col++) {
      penX = CellSize * col;
      let theCell:CheckerboardCell = board.getCell(row, col);
      let cellBGColor:number = normalCellColor;
      if (theCell.occupied) {
        cellBGColor = occupiedCellColor;
      } else if (theCell.visited) {
        cellBGColor = visitedCellColor;
      }
      // console.log("we will use " + cellBGColor);
      boardGraphics.beginFill(cellBGColor, 1);
      boardGraphics.drawRect(penX,penY, CellSize,CellSize);
      boardGraphics.endFill();
      // console.log("collecting cell at " + row + "," + col + ", pen at " + penX + "," + penY);

      switch (theCell.pointerDirection) {
        case Direction.Up:
          boardGraphics.moveTo(penX, penY + CellSize);
          boardGraphics.lineTo(penX + CellSize/2, penY);
          boardGraphics.lineTo(penX + CellSize, penY + CellSize);
          break;
        case Direction.Right:
          boardGraphics.moveTo(penX, penY);
          boardGraphics.lineTo(penX + CellSize, penY + CellSize/2);
          boardGraphics.lineTo(penX, penY + CellSize);
          break;
        case Direction.Down:
          boardGraphics.moveTo(penX, penY);
          boardGraphics.lineTo(penX + CellSize/2, penY + CellSize);
          boardGraphics.lineTo(penX + CellSize, penY);
          break;
        case Direction.Left:
          boardGraphics.moveTo(penX + CellSize, penY);
          boardGraphics.lineTo(penX, penY + CellSize/2);
          boardGraphics.lineTo(penX + CellSize, penY + CellSize);
          break;
        default:
          throw new Error("Bad direction given");
      }
    }
  }
  board.isDirty = false;
}

function drawBoard():void {
  if (!isRunning) {
    return;
  }
  updateCells();
  renderer.render(stage);
  if (!hasEnded) {
    board.advanceCursor();
  }
}
