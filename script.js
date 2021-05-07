async function get() {
    const result = await axios( {
        method: 'get',
        url: 'https://www.spaceflightnewsapi.net/api/v2/articles',
    });
    let articleTitles = [];
    result.data.forEach(article => {
        articleTitles.push(article.title)
    })
    return articleTitles;
}
get().then( (data) => {
    let slider = document.getElementById('slider')
    data.forEach(title => {
        let div = document.createElement('div');
        div.classList.add('testTitle')
        div.innerHTML = title;
        slider.appendChild(div);
    })
    let div = document.createElement('div');
    div.classList.add('testTitle')
    div.innerHTML = data[0];
    slider.appendChild(div);
});

// High score was only getting updated inside the game body
// We need to do it once outside first
let highScore = parseInt(localStorage.getItem("highScore"));
let highScoreDisplay = document.getElementById("highScoreInfo");
if (isNaN(highScore)) {
    highScoreDisplay.innerHTML = "Never played before";
} else {
    highScoreDisplay.innerHTML = `High Score:  ${highScore}`;
}

function startGame () {
    const startGameButton = document.getElementById('startGame');
    startGameButton.parentNode.removeChild(startGameButton);
    const canvas = document.getElementById('canvas1');
    let ctx = canvas.getContext('2d')
    canvas.width = 900;
    canvas.height = 600;
    canvas.classList.remove("active");

// global variables
    let numberOfResources = 300;
    let enemiesInterval = 300;
    let bossesInterval = 2000;
    let frame = 0;
    let gameOver = false;
    let score = 0;
    let chosenDefender = 1;
    const cellSize = 100;
    const cellGap = 3;
    const winningScore = 50000;
    const enemies = [];
    const enemyPosition = [];
    const gameGrid = [];
    const defenders = [];
    const projectiles = [];
    const resources = [];
    const myStorage = window.localStorage;
    const lastHighScore = parseInt(localStorage.getItem("highScore"));
    const highScoreDisplay = document.getElementById("highScoreInfo");

    if (isNaN(lastHighScore)) {
        highScoreDisplay.innerHTML = "Never played before";
    } else {
        highScoreDisplay.innerHTML = `High Score:  ${lastHighScore}`;
    }


// mouse
    const mouse = {
        x: 10,
        y: 10,
        width: 0.1,
        height: 0.1,
        clicked: false
    }
    canvas.addEventListener('mousedown', function () {
        mouse.clicked = true;
    });
    canvas.addEventListener('mouseup', function () {
        mouse.clicked = false;
    });

    let canvasPosition = canvas.getBoundingClientRect();
    canvas.addEventListener('mousemove', function (e) {
        mouse.x = e.x - canvasPosition.left;
        mouse.y = e.y - canvasPosition.top;
    });

    canvas.addEventListener('mouseleave', function () {
        mouse.x = undefined;
        mouse.y = undefined;
    })

// game board
    const controlsBar = {
        width: canvas.width,
        height: cellSize
    }

    class Cell {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = cellSize;
            this.height = cellSize;
        }

        draw() {
            if (mouse.x && mouse.y && collision(this, mouse)) {
                ctx.strokeStyle = 'gold';
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        }
    }

    function createGrid() {
        for (let y = cellSize; y < canvas.height; y += cellSize) {
            for (let x = 0; x < canvas.width; x += cellSize) {
                gameGrid.push(new Cell(x, y));
            }
        }
    }
    createGrid();

    function handleGameGrid() {
        for (let i = 0; i < gameGrid.length; i++) {
            gameGrid[i].draw();
        }
    }

    async function create(content) {        //new tweet
        const response = await axios({
            method: 'post',
            url: 'https://comp426-1fa20.cs.unc.edu/a09/tweets',
            withCredentials: true,
            data: {
                body: content
            },
        });
        return response.data;
    }



//projectiles
    const bullet1 = new Image();
    bullet1.src = 'Sprites/Projectiles/projectile3.png';
    const bullet2 = new Image();
    bullet2.src = 'Sprites/Projectiles/projectile1.png';
    const bullet3 = new Image();
    bullet3.src = 'Sprites/Projectiles/projectile2.png';

    class Projectiles {
        constructor(x, y, type,) {
            this.x = x;
            this.y = y;
            this.defenderType = type;
            this.width = 35;
            this.height = 45;
            this.power = 0;
            this.speed = 8;
            this.frameX = 0;
            this.frameY = 0;
            this.spriteWidth = 3322;
            this.spriteHeight = 2919;
            this.minFrame = 0;
            this.maxFrame = 6;
            this.audio = new Audio();

            if (this.defenderType === 1) {
                this.power = 25;
                this.projectile = bullet3;
                this.audio.src = 'Sprites/Audio/zapsplatsingle001.mp3';
            } else if (this.defenderType === 2) {
                this.power = 35;
                this.projectile = bullet1;
                this.audio.src = 'Sprites/Audio/laser002.mp3';
            } else if (this.defenderType === 3) {
                this.power = 45;
                this.projectile = bullet2;
                this.audio.src = 'Sprites/Audio/zapsplat008.mp3';
            }
            this.audio.volume = 0.08
            this.audio.play();
        }

        update() {
            this.x += this.speed;
        }

        draw() {
            ctx.beginPath();
            ctx.drawImage(
                this.projectile, this.frameX * this.spriteWidth + 10, this.frameY * this.spriteHeight + 10,
                this.spriteWidth + 10, this.spriteHeight + 10, this.x, this.y, this.width, this.height );
        }
    }
    function handleProjectiles() {
        for (let i = 0; i < projectiles.length; i++) {
            projectiles[i].update();
            projectiles[i].draw();
            for (let j = 0; j < enemies.length; j++) {
                if (enemies[j] && projectiles[i] && collision(projectiles[i], enemies[j])) {
                    enemies[j].health -= projectiles[i].power;
                    projectiles.splice(i, 1);
                    i--;
                }
            }
// keeps the projectile from hitting enemies not on screen
            if (projectiles[i] && projectiles[i].x > canvas.width - cellSize) {
                projectiles.splice(i, 1);
                i--;
            }
        }
    }

// defenders
    const defender1 = new Image();
    defender1.src = 'Sprites/Jetpack/tower1.png';
    const defender2 = new Image();
    defender2.src = 'Sprites/Jetpack/tower2.png';
    const defender3 = new Image();
    defender3.src = 'Sprites/Jetpack/tower3.png';

    class Defender {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = cellSize - cellGap * 2;
            this.height = cellSize - cellGap * 2;
            this.shooting = false;
            this.timer = 0;
            this.frameX = 0;
            this.frameY = 0;
            this.spriteWidth = 871;
            this.spriteHeight = 663;
            this.minFrame = 0;
            this.maxFrame = 6;
            this.chosenDefender = chosenDefender;

            if (this.chosenDefender === 1) {
                this.health = 100;
            } else if (this.chosenDefender === 2) {
                this.health = 150;
            } else if (this.chosenDefender === 3) {
                this.health = 200;
            }
        }

        draw() {
            ctx.fillStyle = 'limegreen';
            ctx.font = '20px orbitron';
            ctx.fillText(Math.floor(this.health), this.x + 28, this.y + -5);
            if (this.chosenDefender === 1) {
                ctx.drawImage(defender1, this.frameX * this.spriteWidth, 0, this.spriteWidth, this.spriteHeight,
                    this.x, this.y, this.width, this.height);
            } else if (this.chosenDefender === 2) {
                ctx.drawImage(defender2, this.frameX * this.spriteWidth, 0, this.spriteWidth, this.spriteHeight,
                    this.x, this.y, this.width, this.height);
            } else if (this.chosenDefender === 3) {
                ctx.drawImage(defender3, this.frameX * this.spriteWidth, 0, this.spriteWidth, this.spriteHeight,
                    this.x, this.y, this.width, this.height);
            }
        }

        update() {
            if (frame % 10 === 0) {
                if (this.frameX < this.maxFrame) this.frameX++;
                else this.frameX = this.minFrame;
            }
            if (this.shooting) {
                this.timer++;
                if (this.timer % 100 === 0) {
                    projectiles.push(new Projectiles(this.x + 70, this.y + 25, this.chosenDefender));
                }
            } else {
                this.timer = 0;
            }
        }
    }

    function handleDefenders() {
        for (let i = 0; i < defenders.length; i++) {
            defenders[i].draw();
            defenders[i].update();
            defenders[i].shooting = enemyPosition.indexOf(defenders[i].y) !== -1;
            for (let j = 0; j < enemies.length; j++) {
                if (defenders[i] && collision(defenders[i], enemies[j])) {
                    enemies[j].movement = 0;
                    defenders[i].health -= 0.2;
                }
                if (defenders[i] && defenders[i].health < 1) {
                    defenders.splice(i, 1);
                    i--;
                    enemies[j].movement = enemies[j].speed;
                }
            }
        }
    }

    const card1 = {
        x: 10,
        y: 10,
        width: 70,
        height: 85
    }
    const card2 = {
        x: 90,
        y: 10,
        width: 70,
        height: 85
    }
    const card3 = {
        x: 170,
        y: 10,
        width: 70,
        height: 85
    }

    function chooseDefender() {
        let card1stroke = 'grey';
        let card2stroke = 'grey';
        let card3stroke = 'grey';
        if (collision(mouse, card1) && mouse.clicked) {
            chosenDefender = 1;
        } else if (collision(mouse, card2) && mouse.clicked) {
            chosenDefender = 2;
        } else if (collision(mouse, card3) && mouse.clicked) {
            chosenDefender = 3;
        }
        if (chosenDefender === 1) {
            card1stroke = 'gold';
            card2stroke = 'grey';
            card3stroke = 'grey';
        } else if (chosenDefender === 2) {
            card1stroke = 'grey';
            card2stroke = 'gold';
            card3stroke = 'grey';
        } else if (chosenDefender === 3) {
            card1stroke = 'grey';
            card2stroke = 'grey';
            card3stroke = 'gold';
        } else {
            card1stroke = 'grey';
            card2stroke = 'grey';
            card3stroke = 'grey';
        }

        ctx.lineWidth = 1;
        ctx.fillStyle = 'grey';

        ctx.fillRect(card1.x + 25, card1.y + -7, card1.width, card1.height);
        ctx.strokeStyle = card1stroke;
        ctx.strokeRect(card1.x + 25, card1.y + -7, card1.width, card1.height);
        ctx.drawImage(defender1, 0, 0, 871, 663, 0, 5, 871 / 7, 663 / 7);

        ctx.fillRect(card2.x + 25, card2.y + -7, card2.width, card2.height);
        ctx.strokeStyle = card2stroke;
        ctx.strokeRect(card2.x + 25, card2.y + -7, card2.width, card2.height);
        ctx.drawImage(defender2, 0, 0, 871, 663, 80, 5, 871 / 7, 663 / 7);

        ctx.fillRect(card3.x + 25, card3.y + -7, card3.width, card3.height);
        ctx.strokeStyle = card3stroke;
        ctx.strokeRect(card3.x + 25, card3.y + -7, card3.width, card3.height);
        ctx.drawImage(defender3, 0, 0, 871, 663, 160, 5, 871 / 7, 663 / 7);
    }

// Floating messages
    const floatingMessages = [];

    class floatingMessage {
        constructor(value, x, y, size, color) {
            this.value = value;
            this.x = x;
            this.y = y;
            this.size = size;
            this.lifeSpan = 0;
            this.color = color;
            this.opacity = 1;
        }

        update() {
            this.y -= 0.3;
            this.lifeSpan += 1;
            if (this.opacity > 0.05) this.opacity -= 0.05;
        }

        draw() {
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.font = this.size + 'px orbitron';
            ctx.fillText(this.value, this.x, this.y);
            ctx.globalAlpha = 1;
        }
    }

    function handleFloatingMessages() {
        for (let i = 0; i < floatingMessages.length; i++) {
            floatingMessages[i].update();
            floatingMessages[i].draw();
            if (floatingMessages[i].lifeSpan >= 50) {
                floatingMessages.splice(i, 1);
                i--;
            }
        }
    }

// enemies
    const enemyTypes = [];
    const enemy1 = new Image();
    enemy1.src = 'Sprites/Aliens/Alien1.png';
    enemyTypes.push(enemy1);
    const enemy2 = new Image();
    enemy2.src = 'Sprites/Aliens/Alien2.png'
    enemyTypes.push(enemy2);
    const enemy3 = new Image();
    enemy3.src = 'Sprites/Aliens/Alien3.png';
    enemyTypes.push(enemy3);
    const boss1 = new Image();
    boss1.src = 'Sprites/Aliens/alienboss1.png';
    enemyTypes.push(boss1);
    const boss2 = new Image();
    boss2.src = 'Sprites/Aliens/alienboss2.png';
    enemyTypes.push(boss2);

    class Enemy {
        constructor(verticalPosition, type) {
            this.x = canvas.width;
            this.y = verticalPosition;
            this.width = cellSize - cellGap * 2;
            this.height = cellSize - cellGap * 2;
            this.speed = Math.random() * 0.4 + 0.8;
            this.movement = this.speed + (score * 0.002);
            this.health = 100;
            this.maxHealth = this.health;
            this.enemyType = enemyTypes[type];
            this.frameX = 0;
            this.frameY = 0;
            this.minFrame = 0;
            this.maxFrame = 4;
            this.spriteWidth = 575;
            this.spriteHeight = 817;
            this.audio = new Audio();
            this.audio2 = new Audio();

            if (this.enemyType === enemy1) {
                this.audio.src = 'Sprites/Audio/hover.mp3';
                this.health = 75;
            } else if (this.enemyType === enemy2) {
                this.audio.src = 'Sprites/Audio/hover.mp3';
                this.health = 85;
            } else if (this.enemyType === enemy3) {
                this.audio.src = 'Sprites/Audio/hover.mp3';
                this.health = 95;
            } else if (this.enemyType === boss1) {
                this.audio.src = 'Sprites/Audio/flap.mp3'
                this.audio.loop = true;
                this.audio2.src = 'Sprites/Audio/screech2.mp3'
                this.maxFrame = 8;
                this.spriteWidth = 511;
                this.spriteHeight = 769;
                this.health = 105;
            } else if (this.enemyType === boss2) {
                this.audio.src = 'Sprites/Audio/flap.mp3'
                this.audio.loop = true;
                this.audio2.src = 'Sprites/Audio/screech1.mp3'
                this.maxFrame = 14;
                this.spriteWidth = 733;
                this.spriteHeight = 1043;
                this.health = 115;
            }
            this.audio.volume = 0.05;
            this.audio.play();
            this.audio2.play();

            for (let i = 0; i <= score; i++) {
                if (score > 0) {
                    this.health = this.health + (this.health * 0.0003);
                }
            }
        }

// controls how fast the animation is
        update() {
            this.x -= this.movement;
            if (frame % 9 === 0) {
                if (this.frameX < this.maxFrame) this.frameX++;
                else this.frameX = this.minFrame;
            }
// increases speed based on score
            if (score != 0) {
                this.movement = this.speed + (score*0.002);
            }
        }

        draw() {
            ctx.fillStyle = 'red';
            ctx.font = '20px orbitron';
            ctx.fillText(Math.floor(this.health), this.x + 28, this.y + -5);
            ctx.drawImage(this.enemyType, this.frameX * this.spriteWidth, 0, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.width, this.height);
        }
// killing the audio for dead enemies?
        killAudio() {
            this.audio.pause();
            this.audio2.pause();
        }
    }

    function handleEnemies() {
        for (let i = 0; i < enemies.length; i++) {
            enemies[i].update();
            enemies[i].draw();
            if (enemies[i].x < 0) {
                gameOver = true;
            }
            if (enemies[i].health < 1) {
                enemies[i].killAudio();
                let gainedResources = enemies[i].maxHealth / 5;
                floatingMessages.push(new floatingMessage('+' + gainedResources, enemies[i].x, enemies[i].y, 30, 'gold'));
                floatingMessages.push(new floatingMessage('+' + gainedResources, 565, 65, 30, 'gold'));
                numberOfResources += gainedResources;
                score += gainedResources;
                const findThisIndex = enemyPosition.indexOf(enemies[i].y);
                enemyPosition.splice(findThisIndex, 1);
                enemies.splice(i, 1);
                i--;
            }
        }
        if (frame % enemiesInterval === 1) {
            let verticalPosition = Math.floor(Math.random() * 5 + 1) * cellSize + cellGap;
            enemies.push(new Enemy(verticalPosition, randomIndex(3)));
            enemyPosition.push(verticalPosition);
            if (enemiesInterval > 120) enemiesInterval -= 50;
        }
        if (frame % bossesInterval === 2 && score > 0) {
            let verticalPosition = Math.floor(Math.random() * 5 + 1) * cellSize + cellGap;
            enemies.push(new Enemy(verticalPosition, 3 + randomIndex(2)));
            enemyPosition.push(verticalPosition);
        }

    }


// resources
    const resource1 = new Image();
    resource1.src = 'Sprites/Collectables/greenStar.png';
    const resource2 = new Image();
    resource2.src = 'Sprites/Collectables/redStar.png';
    const resource3 = new Image();
    resource3.src = 'Sprites/Collectables/goldStar.png';

    const amounts = [20, 30, 40];

    class Resource {
        constructor() {
            this.x = Math.random() * (canvas.width - cellSize);
            this.y = (Math.floor(Math.random() * 5) + 1) * cellSize + 25;
            this.width = cellSize * 0.6;
            this.height = cellSize * 0.6;
            this.amount = amounts[Math.floor(Math.random() * amounts.length)];
            this.speed = Math.random() * 0.4 + 0.8;
            this.frameX = 0;
            this.frameY = 0;
            this.frame = 0;
            this.spriteWidth = 318;
            this.spriteHeight = 307;
            this.minFrame = 0;
            this.maxFrame = 5;
            this.audio = new Audio;
            this.audio.src = 'Sprites/Audio/collect.mp3';

            if (this.amount === 20) {
                this.spriteColor = resource1;
            } else if (this.amount === 30) {
                this.spriteColor = resource2;
            } else {
                this.spriteColor = resource3;
            }
        }

        draw() {
            ctx.fillStyle = 'lightblue';
            ctx.font = '20px orbitron';
            ctx.fillText(this.amount, this.x + 13, this.y + -10);
            ctx.drawImage(this.spriteColor, this.frameX * this.spriteWidth, this.frameY * this.spriteHeight, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.width, this.height);

        }

        update() {
            if (frame % 10 === 0) {
                if (this.frameX < this.maxFrame) this.frameX++;
                else this.frameX = this.minFrame;
            }
        }

        starAudio() {
            this.audio.play();
        }
    }

    function handleResources() {
        if (frame % 500 === 0 && score < winningScore) {
            resources.push(new Resource());
        }
        for (let i = 0; i < resources.length; i++) {
            resources[i].update();
            resources[i].draw();
            if (resources[i] && mouse.x && mouse.y && collision(resources[i], mouse)) {
                resources[i].starAudio();
                numberOfResources += resources[i].amount;
                floatingMessages.push(new floatingMessage('+' + resources[i].amount,
                    resources[i].x, resources[i].y, 30, 'gold'));
                floatingMessages.push(new floatingMessage('+' + resources[i].amount,
                    580, 70, 30, 'gold'));
                resources.splice(i, 1);
                i--;

            }
        }
    }

//utilities

    function randomIndex(length) {
        return Math.floor(Math.random() * length);
    }

    function handleGameStatus() {
        ctx.fillStyle = 'gold';
        ctx.font = '30px orbitron';
        ctx.fillText('Score: ' + score, 300, 40);
        ctx.fillText('Resources: ' + numberOfResources, 300, 80);
        if (gameOver) {
            if (score <= 10000) {
                let myGradient = ctx.createLinearGradient(0, 0, 1200, 0,)
                myGradient.addColorStop(0, 'orange');
                myGradient.addColorStop(0.4, 'red');
                myGradient.addColorStop(0.6, 'yellow');
                ctx.fillStyle = myGradient;
                ctx.font = '90px orbitron';
                ctx.fillText('Game Over Noob', 30, 350);
                updateHighScore(score);
                document.getElementById('canvas1')
                create(' I Suck! My Score is: ' + score + ' in Alien Defender!');
            } else if (score > 10000 && score <= 30000) {
                let myGradient2 = ctx.createLinearGradient(0, 0, 1200, 0,)
                myGradient2.addColorStop(0, 'orange');
                myGradient2.addColorStop(0.4, 'red');
                myGradient2.addColorStop(0.6, 'yellow');
                ctx.fillStyle = myGradient2;
                ctx.font = '90px orbitron';
                ctx.fillText('You Suck!', 180, 250);
                ctx.fillText('Game Over', 150, 340);
                updateHighScore(score)
                create('I shouldnt quit my day job! My Score is: ' + score + ' in Alien Defender!')
            } else if (score > 30000 && score <= 49999) {
                let myGradient3 = ctx.createLinearGradient(0, 0, 1200, 0,)
                myGradient3.addColorStop(0, 'orange');
                myGradient3.addColorStop(0.4, 'red');
                myGradient3.addColorStop(0.6, 'yellow');
                ctx.fillStyle = myGradient3;
                ctx.font = '90px orbitron';
                ctx.fillText('So Close!', 195, 250);
                ctx.fillText('Game Over', 150, 340);
                updateHighScore(score)
                create('Started from the bottom, now Im here! My Score is: ' + score + ' in Alien Defender!')
            } else if (score >= 50000) {
                let myGradient4 = ctx.createLinearGradient(0, 0, 1200, 0,)
                myGradient4.addColorStop(0, 'orange');
                myGradient4.addColorStop(0.4, 'red');
                myGradient4.addColorStop(0.6, 'yellow');
                ctx.fillStyle = myGradient4;
                ctx.font = '90px orbitron';
                ctx.fillText('Ok', 390, 250);
                ctx.fillText('Not Bad', 250, 340);
                updateHighScore(score)
                create('Bet you cant beat me! My Score is: ' + score + ' in Alien Defender!')
            }
        }
    }

    function updateHighScore() {
        if (score > lastHighScore || isNaN(lastHighScore)) {
            localStorage.setItem('highScore', String(score));
            highScoreDisplay.innerHTML = `High Score:  ${lastHighScore}`;
        }
    }

    canvas.addEventListener('click', function () {
        const gridPositionX = mouse.x - (mouse.x % cellSize) + cellGap;
        const gridPositionY = mouse.y - (mouse.y % cellSize) + cellGap;
        if (gridPositionY < cellSize) return;
        for (let i = 0; i < defenders.length; i++) {
            if (defenders[i].x === gridPositionX && defenders[i].y === gridPositionY)
                return;
        }
        let defenderCost;
        if (chosenDefender === 1) {
            defenderCost = 75;
        } else if (chosenDefender === 2) {
            defenderCost = 125;
        } else if (chosenDefender === 3) {
            defenderCost = 175;
        }
        if (numberOfResources >= defenderCost) {
            defenders.push(new Defender(gridPositionX, gridPositionY));
            numberOfResources -= defenderCost;
        } else {
            floatingMessages.push(new floatingMessage("need more resources", mouse.x, mouse.y,
                25, 'red'));
        }
    });

//background
    const background = new Image();
    background.src = 'Sprites/Background/space.jpg';

    function handleBackground() {
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        handleBackground();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, controlsBar.width, controlsBar.height);
        handleGameGrid();
        handleDefenders();
        handleResources();
        handleProjectiles();
        handleEnemies();
        chooseDefender();
        handleGameStatus();
        handleFloatingMessages();
        frame++;
        if (!gameOver) requestAnimationFrame(animate);
    }

    animate();

    function collision(first, second) {
        if (!(first.x > second.x + second.width ||
            first.x + first.width < second.x ||
            first.y > second.y + second.height ||
            first.y + first.height < second.y)) {
            return true;
        }
    }

    window.addEventListener('resize', function () {
        canvasPosition = canvas.getBoundingClientRect();
    })
}