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

// Monster spawn points
const enemySpawnPoints = [
    { x: 400, y: 100 },
    { x: 100, y: 100 },
];

function preload() {
    this.load.image('player', 'assets/Guns/1c.png'); // เปลี่ยนเป็น sprite top-down ได้
    // Preload all enemy walk frames for 6 types
    for (let t = 1; t <= 6; t++) {
        for (let i = 1; i <= 4; i++) {
            this.load.image(`enemy${t}_${i}`, `assets/Monster/${t}/${i}.png`);
        }
    }
    this.load.image('wall', 'assets/Walls/Blue Walls/2.png'); // 50x50 wall tile
    this.load.image('bullet', 'assets/Bullets/Bullets1.png');
    this.load.image('gun', 'assets/Guns/1g.png'); // Load gun image
    this.load.image('collision', 'assets/Colision Sprites/1.png');

    // Preload collision effect images
    // for (let i = 1; i <= 9; i++) {
    //     this.load.image('collision' + i, 'assets/Colision Sprites/' + i + '.png');
    // }
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
    player.displayWidth = 100;
    player.displayHeight = 100;
    // Gun sprite, positioned in front of player (adjust x/y as needed)
    const gunSprite = this.add.sprite(player.x, player.y - 100, 'gun');
    gunSprite.setOrigin(0.5, -0.5);
    this.cameras.main.startFollow(player);
    this.physics.add.collider(player, walls);
    enemies = [];

    // Draw green box at each spawn point
    const spawnBoxGraphics = this.add.graphics();
    spawnBoxGraphics.lineStyle(3, 0x00ff00, 1);
    enemySpawnPoints.forEach(pt => {
        spawnBoxGraphics.strokeRect(pt.x - 25, pt.y - 25, 50, 50);
    });

    // Create walk animation for all 6 enemy types
    for (let t = 1; t <= 6; t++) {
        this.anims.create({
            key: `enemy${t}_walk`,
            frames: [
                { key: `enemy${t}_1` },
                { key: `enemy${t}_2` },
                { key: `enemy${t}_3` },
                { key: `enemy${t}_4` }
            ],
            frameRate: 8,
            repeat: -1
        });
    }

    // Spawn enemies at each spawn point
    enemies = [];
    enemySpawnPoints.forEach(pt => {
        const type = Phaser.Math.Between(1, 6);
        const enemy = this.physics.add.sprite(pt.x, pt.y, `enemy${type}_1`);
        enemy.setBounce(0.5);
        enemy.setCollideWorldBounds(true);
        enemy.body.setSize(30, 30);
        enemy.body.setOffset(30, 30);
        this.physics.add.collider(enemy, walls);
        enemy.anims.play(`enemy${type}_walk`);
        enemy.enemyType = type;
        enemies.push(enemy);
    });

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
    this.input.on('pointerdown', (pointer) => {
        shootBullet.call(this, pointer);
    });


    // Bullet-enemy collision
    this.physics.add.overlap(bullets, enemies, (bullet, enemy) => {
        bullet.destroy();
        // Particle effect: use random collision sprite
        const emitter = this.add.particles(0, 0, 'collision', {
            x: enemy.x,
            y: enemy.y,
            speed: { min: -200, max: 200 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
        });
        this.time.delayedCall(100, () => {
            emitter.stop();
        }, [], this);
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

    // สร้าง enemy ใหม่ทุก 2 วินาที
    // this.time.addEvent({
    //     delay: 2000,
    //     loop: true,
    //     callback: () => {
    //         // สุ่มจุด spawn
    //         const pt = Phaser.Utils.Array.GetRandom(enemySpawnPoints);
    //         const type = Phaser.Math.Between(1, 6);
    //         const enemy = this.physics.add.sprite(pt.x, pt.y, `enemy${type}_1`);
    //         enemy.setBounce(0.5);
    //         enemy.setCollideWorldBounds(true);
    //         enemy.body.setSize(30, 30);
    //         enemy.body.setOffset(30, 30);
    //         this.physics.add.collider(enemy, walls);
    //         enemy.anims.play(`enemy${type}_walk`);
    //         enemy.enemyType = type;
    //         enemies.push(enemy);
    //     }
    // });
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
    player.gunSprite.rotation = playerAngle - Math.PI / 2;
    // Gun follows player position
    const gunDistance = -60;
    player.gunSprite.x = player.x + Math.cos(playerAngle) * gunDistance;
    player.gunSprite.y = player.y + Math.sin(playerAngle) * gunDistance;
    player.gunSprite.setFlipX(true);

    // Access scoreText from the scene (this)
    enemies.forEach((enemy, idx) => {
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
    enemies.forEach((enemy, idx) => {
        if (!enemy.active) return;
        debugGraphics.strokeRect(
            enemy.body.x,
            enemy.body.y,
            enemy.body.width,
            enemy.body.height
        );
        const enemyAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        enemy.setAngle(Phaser.Math.RadToDeg(enemyAngle) - 90);
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
    enemies.forEach((enemy, idx) => {
        if (!enemy.active) return;
        // Random movement: change direction every 1s
        if (!enemy.moveTimer || time > enemy.moveTimer) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            enemy.moveDir = { x: Math.cos(angle), y: Math.sin(angle) };
            enemy.moveTimer = time + 1000;
        }
        enemy.setVelocity(enemy.moveDir.x * 100, enemy.moveDir.y * 100);

        // Shoot at player every 1.2s
        if (!enemy.lastShotTime) enemy.lastShotTime = 0;
        if (time > enemy.lastShotTime + 1200) {
            // shootEnemyBullet.call(this, enemy, player);
            enemy.lastShotTime = time;
        }
    });

    // Flip gun image if aiming left
    let deg = Phaser.Math.RadToDeg(playerAngle);
    deg = (deg + 360) % 360; // Normalize
    if (deg > 90 && deg < 270) {
        player.setFlipX(true);
        player.gunSprite.setFlipX(true);
    } else {
        player.setFlipX(false);
        player.gunSprite.setFlipX(false);
    }

    // ใน update()
    if (pointer.isDown) {
        shootBullet.call(this, pointer);
    }
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

    // Calculate direction
    const angle = Phaser.Math.Angle.Between(player.gunSprite.x, player.gunSprite.y, pointer.worldX, pointer.worldY);

    // Offset the bullet spawn point a bit further from the gun tip
    const offset = 150; // ปรับระยะห่างจุดปล่อยกระสุน
    const spawnX = player.gunSprite.x + Math.cos(angle) * offset;
    const spawnY = player.gunSprite.y + Math.sin(angle) * offset;

    const bullet = bullets.get(spawnX, spawnY);
    if (!bullet) return;
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.body.reset(spawnX, spawnY);

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