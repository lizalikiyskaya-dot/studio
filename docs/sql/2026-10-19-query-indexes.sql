-- Индексы для запросов кабинета: выборки по ученику, книге, циклу и ветке комментариев.
-- Только CREATE INDEX IF NOT EXISTS. Строки не читаются и не меняются.
-- Повторный запуск ничего не создаёт заново.

CREATE INDEX IF NOT EXISTS "Comment_model_recordId_idx" ON "Comment" ("model", "recordId");

CREATE INDEX IF NOT EXISTS "Note_studentId_idx" ON "Note" ("studentId");
CREATE INDEX IF NOT EXISTS "Material_studentId_idx" ON "Material" ("studentId");
CREATE INDEX IF NOT EXISTS "Draft_studentId_idx" ON "Draft" ("studentId");
CREATE INDEX IF NOT EXISTS "PopArcCharacter_studentId_idx" ON "PopArcCharacter" ("studentId");
CREATE INDEX IF NOT EXISTS "BeliefCard_studentId_idx" ON "BeliefCard" ("studentId");
CREATE INDEX IF NOT EXISTS "StoryCircleCard_studentId_idx" ON "StoryCircleCard" ("studentId");
CREATE INDEX IF NOT EXISTS "CustomExercise_studentId_idx" ON "CustomExercise" ("studentId");
CREATE INDEX IF NOT EXISTS "ExerciseComment_exerciseId_idx" ON "ExerciseComment" ("exerciseId");
CREATE INDEX IF NOT EXISTS "FreeSection_studentId_idx" ON "FreeSection" ("studentId");
CREATE INDEX IF NOT EXISTS "Task_studentId_idx" ON "Task" ("studentId");
CREATE INDEX IF NOT EXISTS "Book_studentId_idx" ON "Book" ("studentId");
CREATE INDEX IF NOT EXISTS "GrapesSetting_bookId_idx" ON "GrapesSetting" ("bookId");
CREATE INDEX IF NOT EXISTS "PlanChapter_bookId_idx" ON "PlanChapter" ("bookId");
CREATE INDEX IF NOT EXISTS "Character_bookId_idx" ON "Character" ("bookId");
CREATE INDEX IF NOT EXISTS "WorldEntry_bookId_idx" ON "WorldEntry" ("bookId");
CREATE INDEX IF NOT EXISTS "Act_bookId_idx" ON "Act" ("bookId");
CREATE INDEX IF NOT EXISTS "ActChapter_actId_idx" ON "ActChapter" ("actId");
CREATE INDEX IF NOT EXISTS "StorylineBlock_chapterId_idx" ON "StorylineBlock" ("chapterId");
CREATE INDEX IF NOT EXISTS "WorkPlan_studentId_idx" ON "WorkPlan" ("studentId");
CREATE INDEX IF NOT EXISTS "Submission_studentId_idx" ON "Submission" ("studentId");
CREATE INDEX IF NOT EXISTS "OpenCall_studentId_idx" ON "OpenCall" ("studentId");
CREATE INDEX IF NOT EXISTS "Cycle_studentId_idx" ON "Cycle" ("studentId");
CREATE INDEX IF NOT EXISTS "Story_studentId_idx" ON "Story" ("studentId");
CREATE INDEX IF NOT EXISTS "Story_cycleId_idx" ON "Story" ("cycleId");
CREATE INDEX IF NOT EXISTS "CycleCharacter_cycleId_idx" ON "CycleCharacter" ("cycleId");
CREATE INDEX IF NOT EXISTS "StoryCharacter_storyId_idx" ON "StoryCharacter" ("storyId");
CREATE INDEX IF NOT EXISTS "CycleWorldEntry_cycleId_idx" ON "CycleWorldEntry" ("cycleId");
CREATE INDEX IF NOT EXISTS "StoryWorldEntry_storyId_idx" ON "StoryWorldEntry" ("storyId");
