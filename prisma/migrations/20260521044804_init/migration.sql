-- CreateTable
CREATE TABLE "bot"."CheckItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot"."DailyLog" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkItemId" INTEGER NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot"."UserSetting" (
    "userId" TEXT NOT NULL,
    "alarmTime" TEXT,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "bot"."Notice" (
    "id" SERIAL NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckItem_name_key" ON "bot"."CheckItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_checkItemId_key" ON "bot"."DailyLog"("userId", "date", "checkItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Notice_sourceId_key" ON "bot"."Notice"("sourceId");

-- AddForeignKey
ALTER TABLE "bot"."DailyLog" ADD CONSTRAINT "DailyLog_checkItemId_fkey" FOREIGN KEY ("checkItemId") REFERENCES "bot"."CheckItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
