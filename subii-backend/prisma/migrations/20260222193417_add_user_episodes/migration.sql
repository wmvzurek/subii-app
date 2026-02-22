-- CreateTable
CREATE TABLE "user_episodes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tmdbSeriesId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_episodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_episodes_userId_tmdbSeriesId_seasonNumber_episodeNumber_key" ON "user_episodes"("userId", "tmdbSeriesId", "seasonNumber", "episodeNumber");
