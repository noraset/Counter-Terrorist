const config = {
    type: Phaser.AUTO,
    width: 500,
    height: 500,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

const game = new Phaser.Game(config);

let player, cursors, bopKey, lastBopTime = 0;
let enemies = [];
let score = 0;
let debugGraphics;

function preload() {
    // Ground is just a color, no image needed
    this.load.image('player', 'assets/mainChar/1/idle.png'); // เปลี่ยนเป็น sprite top-down ได้
    this.load.image('enemy', 'assets/Monster/1/2.png');   // enemy dummy
    this.load.image('wall', 'assets/Walls/Blue Walls/2.png'); // 50x50 wall tile
}

function create() {
    // Draw colored ground (e.g., light blue)
    const ground = this.add.graphics();
    ground.fillStyle(0x87ceeb, 1); // Sky blue
    ground.fillRect(0, 0, 500, 500);
    ground.setDepth(-1);

    // Create walls as a grid of wall images (50x50)
    const walls = this.physics.add.staticGroup();
    // Camera follows the player
    this.cameras.main.setBounds(0, 0, 500, 500); // World size
    this.physics.world.setBounds(0, 0, 500, 500);
    // Wall grid รอบขอบ 1600x1200
    // Top and bottom
    for (let x = 0; x < 500; x += 50) {
        // Top
        let topWall = walls.create(x + 25, 25, 'wall');
        topWall.setDisplaySize(50, 50).refreshBody();
        // Bottom
        let bottomWall = walls.create(x + 25, 500 - 25, 'wall');
        bottomWall.setDisplaySize(50, 50).refreshBody();
    }
    // Left and right
    for (let y = 50; y < 500 - 50; y += 50) {
        // Left
        let leftWall = walls.create(25, y + 25, 'wall');
        leftWall.setDisplaySize(50, 50).refreshBody();
        // Right
        let rightWall = walls.create(500 - 25, y + 25, 'wall');
        rightWall.setDisplaySize(50, 50).refreshBody();
    }

    player = this.physics.add.sprite(400, 400, 'player');
    player.setCollideWorldBounds(true);
    player.setBounce(0.5);
    // Set collider size smaller than sprite and center it
    player.body.setSize(30, 30);
    player.body.setOffset(30, 30);
    this.cameras.main.startFollow(player);

    // Collide player and enemies with all walls
    this.physics.add.collider(player, walls);
    enemies = [];
    for (let i = 0; i < 3; i++) {
        const x = Phaser.Math.Between(100, 400);
        const y = Phaser.Math.Between(100, 400);
        const enemy = this.physics.add.sprite(x, y, 'enemy');
        enemy.setBounce(0.5);
        enemy.setCollideWorldBounds(true);
        // Set collider size smaller than sprite and center it
        enemy.body.setSize(30, 30);
        enemy.body.setOffset(10, 10);
        this.physics.add.collider(enemy, walls);
        enemies.push(enemy);
    }

    cursors = this.input.keyboard.createCursorKeys();
    bopKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Store scoreText on the scene for access in update
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });

    debugGraphics = this.add.graphics();
    debugGraphics.setDepth(1000); // Draw on top
}

function update(time) {
    const speed = 200;
    player.setVelocity(0);

    if (cursors.left.isDown) player.setVelocityX(-speed);
    if (cursors.right.isDown) player.setVelocityX(speed);
    if (cursors.up.isDown) player.setVelocityY(-speed);
    if (cursors.down.isDown) player.setVelocityY(speed);

    if (Phaser.Input.Keyboard.JustDown(bopKey) && time - lastBopTime > 500) {
        bop.call(this, player);
        lastBopTime = time;
    }

    // Access scoreText from the scene (this)
    enemies.forEach((enemy) => {
        if (enemy.x < -50 || enemy.x > 850 || enemy.y < -50 || enemy.y > 650) {
            // เพิ่มคะแนนเมื่อศัตรูตกฉาก
            score += 1;
            if (this.scoreText) {
                this.scoreText.setText('Score: ' + score);
            }

            // รีเซ็ตตำแหน่ง
            enemy.setPosition(Phaser.Math.Between(100, 700), Phaser.Math.Between(100, 500));
            enemy.setVelocity(0);
        }
    });

    // Draw green box around player and enemies
    debugGraphics.clear();
    debugGraphics.lineStyle(2, 0x00ff00, 1);
    // Player
    debugGraphics.strokeRect(
        player.body.x,
        player.body.y,
        player.body.width,
        player.body.height
    );
    // Enemies
    enemies.forEach((enemy) => {
        debugGraphics.strokeRect(
            enemy.body.x,
            enemy.body.y,
            enemy.body.width,
            enemy.body.height
        );
    });
}

function bop(p) {
    enemies.forEach((enemy) => {
        const dist = Phaser.Math.Distance.Between(p.x, p.y, enemy.x, enemy.y);
        if (dist < 100) {
            // คำนวณแรงกระเด้งจาก player → enemy
            const angle = Phaser.Math.Angle.Between(p.x, p.y, enemy.x, enemy.y);
            const force = 400;
            const vx = Math.cos(angle) * force;
            const vy = Math.sin(angle) * force;
            enemy.setVelocity(vx, vy);
        }
    });
}