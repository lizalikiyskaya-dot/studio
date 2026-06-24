-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'MENTOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "SynopsisMode" AS ENUM ('TEXT', 'LINK');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('UNREAD', 'IN_PROGRESS', 'READ');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('BOOK', 'HANDOUT');

-- CreateEnum
CREATE TYPE "ArcType" AS ENUM ('POSITIVE', 'NEGATIVE', 'FLAT');

-- CreateEnum
CREATE TYPE "FreeSectionType" AS ENUM ('TEXT', 'TABLE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "WorldCategory" AS ENUM ('LOCATIONS', 'FACTIONS', 'LORE', 'TECHNOLOGY', 'MAGIC', 'HISTORY', 'CREATURES', 'LANGUAGES');

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "field" TEXT,
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldSuggestion" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDay" INTEGER,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "category" "MaterialCategory" NOT NULL DEFAULT 'BOOK',
    "title" TEXT NOT NULL DEFAULT '',
    "status" "MaterialStatus" NOT NULL DEFAULT 'UNREAD',
    "pdfUrl" TEXT,
    "pdfName" TEXT,
    "epubUrl" TEXT,
    "epubName" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "link" TEXT,
    "fileName" TEXT,
    "fileData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopArcCharacter" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "arcType" "ArcType",
    "isExample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PopArcCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeliefCard" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "hero" TEXT NOT NULL DEFAULT '',
    "startBelief" TEXT NOT NULL DEFAULT '',
    "endBelief" TEXT NOT NULL DEFAULT '',
    "isExample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BeliefCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomExercise" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "task" TEXT NOT NULL DEFAULT '',
    "answer" TEXT NOT NULL DEFAULT '',
    "answerSuggested" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS',

    CONSTRAINT "CustomExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseComment" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeSection" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "FreeSectionType" NOT NULL DEFAULT 'TEXT',
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tableData" JSONB,

    CONSTRAINT "FreeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "workLink" TEXT,
    "feedbackLink" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "order" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "genre" TEXT NOT NULL DEFAULT '',
    "references" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "partsCount" TEXT NOT NULL DEFAULT '',
    "timeStructure" TEXT NOT NULL DEFAULT '',
    "mainCharacters" TEXT NOT NULL DEFAULT '',
    "dramaticArgument" TEXT NOT NULL DEFAULT '',
    "logline" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL DEFAULT '',
    "annotation" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "synopsisMode" "SynopsisMode" NOT NULL DEFAULT 'TEXT',
    "synopsisText" TEXT NOT NULL DEFAULT '',
    "synopsisLink" TEXT NOT NULL DEFAULT '',
    "grapesGeography" TEXT NOT NULL DEFAULT '',
    "grapesReligion" TEXT NOT NULL DEFAULT '',
    "grapesAchievements" TEXT NOT NULL DEFAULT '',
    "grapesPolitics" TEXT NOT NULL DEFAULT '',
    "grapesEconomy" TEXT NOT NULL DEFAULT '',
    "grapesSocial" TEXT NOT NULL DEFAULT '',
    "settingPhotoUrl" TEXT,
    "settingChips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fantasyUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "fantasyNotes" TEXT NOT NULL DEFAULT '',
    "fantasyGeneral" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL DEFAULT '',
    "dramaticArgument" TEXT NOT NULL DEFAULT '',
    "images" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "plannedChars" INTEGER NOT NULL DEFAULT 0,
    "writtenChars" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "arcType" "ArcType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEntry" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "category" "WorldCategory" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT 'Новая запись',
    "body" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Act" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Act_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActChapter" (
    "id" TEXT NOT NULL,
    "actId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ActChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorylineBlock" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT 'pink',
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StorylineBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldSuggestion_model_recordId_field_key" ON "FieldSuggestion"("model", "recordId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopArcCharacter" ADD CONSTRAINT "PopArcCharacter_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeliefCard" ADD CONSTRAINT "BeliefCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomExercise" ADD CONSTRAINT "CustomExercise_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseComment" ADD CONSTRAINT "ExerciseComment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "CustomExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeSection" ADD CONSTRAINT "FreeSection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChapter" ADD CONSTRAINT "PlanChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEntry" ADD CONSTRAINT "WorldEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Act" ADD CONSTRAINT "Act_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActChapter" ADD CONSTRAINT "ActChapter_actId_fkey" FOREIGN KEY ("actId") REFERENCES "Act"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorylineBlock" ADD CONSTRAINT "StorylineBlock_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "ActChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

