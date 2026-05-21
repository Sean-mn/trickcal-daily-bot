-- CreateTable
CREATE TABLE "bot"."GuildConfig" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);
