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

let keyA;
let keyS;
let keyD;
let keyW;
let player, cursors, bopKey, lastBopTime = 0;
let enemies = [];
let score = 0;
let debugGraphics;
let bullets;
let bulletSpeed = 500;
let lastShotTime = 0;
let enemyBullets;
let enemyBulletSpeed = 300;
let lastEnemyShotTime = 0;
let enemyMoveTimer = 0;
let enemyMoveDir = { x: 0, y: 0 };

function preload() {
    // Ground is just a color, no image needed
    this.load.image('player', 'assets/player.png'); // เปลี่ยนเป็น sprite top-down ได้
    this.load.image('enemy', 'assets/Monster/1/2.png');   // enemy dummy
    this.load.image('wall', 'assets/Walls/Blue Walls/2.png'); // 50x50 wall tile
    this.load.image('bullet', 'assets/Bullets/Bullets1.png');
    this.load.image('gun', 'assets/Guns/1g.png'); // Load gun image
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

    player = this.physics.add.image(400, 400, 'player');
    player.setCollideWorldBounds(true);
    player.setBounce(0.5);
    player.body.setOffset(0, 0);
    player.displayWidth = 50;
    player.displayHeight = 50;
    // Gun sprite, positioned in front of player (adjust x/y as needed)
    const gunSprite = this.add.sprite(player.x, player.y - 100, 'gun');
    gunSprite.setOrigin(0.5, 0.7);
    this.cameras.main.startFollow(player);
    this.physics.add.collider(player, walls);
    enemies = [];
    const x = Phaser.Math.Between(100, 400);
    const y = Phaser.Math.Between(100, 400);
    const enemy = this.physics.add.sprite(x, y, 'enemy');
    enemy.setBounce(0.5);
    enemy.setCollideWorldBounds(true);
    enemy.body.setSize(30, 30);
    enemy.body.setOffset(30, 30);
    this.physics.add.collider(enemy, walls);
    enemies.push(enemy);

    cursors = this.input.keyboard.createCursorKeys();
    keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    bopKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Store scoreText on the scene for access in update
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
        fontSize: '24px',
        fill: '#ffffff',
        fontFamily: 'Arial'
    });

    debugGraphics = this.add.graphics();
    debugGraphics.setDepth(1000); // Draw on top

    // Bullets group
    bullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 20
    });

    // Enemy bullets group
    enemyBullets = this.physics.add.group({
        defaultKey: 'bullet',
        maxSize: 20
    });

    // Shoot on pointerdown
    // this.input.on('pointerdown', (pointer) => {
    //     shootBullet.call(this, pointer);
    // });

    // Bullet-enemy collision
    this.physics.add.overlap(bullets, enemies, (bullet, enemy) => {
        bullet.destroy();
        enemy.destroy();
        score += 1;
        if (this.scoreText) {
            this.scoreText.setText('Score: ' + score);
        }
    });
    // Enemy bullet - player collision
    this.physics.add.overlap(enemyBullets, player, (bullet, player) => {
        bullet.destroy();
        // For now, just log hit
        console.log('Player hit by enemy bullet!');
    });

    // Store reference for update
    player.gunSprite = gunSprite;
}

function update(time) {
    const speed = 200;
    player.body.setVelocity(0);

    if (cursors.left.isDown || keyA.isDown) player.body.setVelocityX(-speed);
    if (cursors.right.isDown || keyD.isDown) player.body.setVelocityX(speed);
    if (cursors.up.isDown || keyW.isDown) player.body.setVelocityY(-speed);
    if (cursors.down.isDown || keyS.isDown) player.body.setVelocityY(speed);

    if (Phaser.Input.Keyboard.JustDown(bopKey) && time - lastBopTime > 500) {
        bop.call(this, player);
        lastBopTime = time;
    }

    // Rotate player and gun to face mouse pointer
    const pointer = this.input.activePointer;
    const playerAngle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    player.setAngle(Phaser.Math.RadToDeg(playerAngle) - 90);
    // Gun follows same angle (already a child, so rotates with container)

    // Rotate enemy to face player
    const mainEnemy = enemies[0];
    if (mainEnemy && mainEnemy.active) {
        const enemyAngle = Phaser.Math.Angle.Between(mainEnemy.x, mainEnemy.y, player.x, player.y);
        mainEnemy.setAngle(Phaser.Math.RadToDeg(enemyAngle) - 90);
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

    // Clean up bullets that go off screen
    bullets.children.each(function (bullet) {
        if (!bullet.active) return;
        if (
            bullet.x < 0 || bullet.x > 500 ||
            bullet.y < 0 || bullet.y > 500
        ) {
            bullet.destroy();
        }
    }, this);
    enemyBullets.children.each(function (bullet) {
        if (!bullet.active) return;
        if (
            bullet.x < 0 || bullet.x > 500 ||
            bullet.y < 0 || bullet.y > 500
        ) {
            bullet.destroy();
        }
    }, this);

    // Enemy AI: random movement and shoot at player
    const enemy = enemies[0];
    if (enemy && enemy.active) {
        // Random movement: change direction every 1s
        if (time > enemyMoveTimer) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            enemyMoveDir.x = Math.cos(angle);
            enemyMoveDir.y = Math.sin(angle);
            enemyMoveTimer = time + 1000;
        }
        enemy.setVelocity(enemyMoveDir.x * 100, enemyMoveDir.y * 100);

        // Shoot at player every 1.2s
        if (time > lastEnemyShotTime + 1200) {
            // shootEnemyBullet.call(this, enemy, player);
            lastEnemyShotTime = time;
        }
    }

    // Gun logic as before
    const gunDistance = -60;
    const gunAngle = player.rotation - Phaser.Math.DegToRad(90);
    player.gunSprite.x = player.x + Math.cos(gunAngle) * gunDistance;
    player.gunSprite.y = player.y + Math.sin(gunAngle) * gunDistance;
    player.gunSprite.rotation = player.rotation + 5;
    player.gunSprite.setFlipX(true);

    // Flip gun image if aiming left
    // let deg = Phaser.Math.RadToDeg(playerAngle);
    // deg = (deg + 360) % 360; // Normalize
    // if (deg > 90 && deg < 270) {
    //     player.gunSprite.setFlipX(true);
    // } else {
    //     player.gunSprite.setFlipX(false);
    // }
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

function shootBullet(pointer) {
    const now = this.time.now;
    if (now - lastShotTime < 200) return; // Fire rate limit
    lastShotTime = now;
    const bullet = bullets.get(player.x, player.y);
    if (!bullet) return;
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.reset(player.x, player.y);
    // Calculate direction
    const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
    this.physics.velocityFromRotation(angle, bulletSpeed, bullet.body.velocity);
    bullet.setCollideWorldBounds(false);
    // Set bullet rotation (convert radians to degrees)
    bullet.setAngle(Phaser.Math.RadToDeg(angle));
}

function shootEnemyBullet(enemy, player) {
    const bullet = enemyBullets.get(enemy.x, enemy.y);
    if (!bullet) return;
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.reset(enemy.x, enemy.y);
    // Calculate direction
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    this.physics.velocityFromRotation(angle, enemyBulletSpeed, bullet.body.velocity);
    bullet.setCollideWorldBounds(false);
    bullet.setAngle(Phaser.Math.RadToDeg(angle));
}