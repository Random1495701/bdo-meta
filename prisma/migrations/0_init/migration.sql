-- CreateTable
CREATE TABLE "bdo_classes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconPath" TEXT,
    "awakened" BOOLEAN NOT NULL DEFAULT false,
    "awakeningWeapon" TEXT,
    "mainWeapon" TEXT,
    "combatType" TEXT,
    "successionGroup" TEXT,
    "awakeningGroup" TEXT,
    "ascensionGroup" TEXT,
    "successionSaDr" REAL,
    "awakeningSaDr" REAL,
    "ascensionSaDr" REAL,
    "isAscension" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "name" TEXT NOT NULL,
    "krName" TEXT,
    "classId" INTEGER,
    "className" TEXT,
    "iconPath" TEXT,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1,
    "skillPoints" INTEGER NOT NULL DEFAULT 0,
    "maxLevel" INTEGER NOT NULL DEFAULT 1,
    "command" TEXT,
    "cooldown" TEXT,
    "cooldownSec" REAL,
    "description" TEXT,
    "damageRowsJson" TEXT,
    "ccTypes" TEXT,
    "protectionTypes" TEXT,
    "pvpDamagePercent" REAL,
    "isQuickSlot" BOOLEAN NOT NULL DEFAULT false,
    "isAbsolute" BOOLEAN NOT NULL DEFAULT false,
    "isAwakening" BOOLEAN NOT NULL DEFAULT false,
    "isSuccession" BOOLEAN NOT NULL DEFAULT false,
    "isBlackSpirit" BOOLEAN NOT NULL DEFAULT false,
    "isPassive" BOOLEAN NOT NULL DEFAULT false,
    "isFlow" BOOLEAN NOT NULL DEFAULT false,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "baseName" TEXT,
    "isMaxRank" BOOLEAN NOT NULL DEFAULT false,
    "prerequisiteIds" TEXT,
    "videoUrl" TEXT,
    "animationDurationMs" INTEGER,
    "tooltipRawHtml" TEXT,
    "addonsJson" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skills_classId_fkey" FOREIGN KEY ("classId") REFERENCES "bdo_classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "skill_change_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skillId" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "className" TEXT,
    "field" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "source" TEXT NOT NULL,
    "patchDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "pvp_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerTag" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "isPractice" BOOLEAN NOT NULL DEFAULT false,
    "duration" TEXT,
    "sessionDate" TEXT,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "ccCount" INTEGER NOT NULL DEFAULT 0,
    "damageDealt" INTEGER NOT NULL DEFAULT 0,
    "damageTaken" INTEGER NOT NULL DEFAULT 0,
    "healing" INTEGER NOT NULL DEFAULT 0,
    "teamData" TEXT,
    "enemyData" TEXT,
    "screenshotUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "bdo_classes_name_key" ON "bdo_classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bdo_classes_slug_key" ON "bdo_classes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skills_skillId_key" ON "skills"("skillId");

-- CreateIndex
CREATE INDEX "skills_classId_idx" ON "skills"("classId");

-- CreateIndex
CREATE INDEX "skills_name_idx" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_groupId_idx" ON "skills"("groupId");

-- CreateIndex
CREATE INDEX "skills_className_idx" ON "skills"("className");

-- CreateIndex
CREATE INDEX "skills_isAbsolute_idx" ON "skills"("isAbsolute");

-- CreateIndex
CREATE INDEX "skills_isAwakening_idx" ON "skills"("isAwakening");

-- CreateIndex
CREATE INDEX "skills_isBlackSpirit_idx" ON "skills"("isBlackSpirit");

-- CreateIndex
CREATE INDEX "skill_change_logs_skillId_idx" ON "skill_change_logs"("skillId");

-- CreateIndex
CREATE INDEX "skill_change_logs_field_idx" ON "skill_change_logs"("field");

-- CreateIndex
CREATE INDEX "skill_change_logs_changeType_idx" ON "skill_change_logs"("changeType");

-- CreateIndex
CREATE INDEX "skill_change_logs_createdAt_idx" ON "skill_change_logs"("createdAt");

-- CreateIndex
CREATE INDEX "pvp_sessions_playerTag_idx" ON "pvp_sessions"("playerTag");

-- CreateIndex
CREATE INDEX "pvp_sessions_sessionType_idx" ON "pvp_sessions"("sessionType");

-- CreateIndex
CREATE INDEX "pvp_sessions_sessionDate_idx" ON "pvp_sessions"("sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

