import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentApi, type StudentMe } from "@edtech/api-client";
import type { Grade, OnboardingInput } from "@edtech/types";
import { useI18n } from "@edtech/i18n";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  PageHeader,
  Spinner,
} from "@edtech/ui";
import { CheckCircleIcon, ClipboardDocumentIcon, LinkIcon } from "@heroicons/react/24/outline";
import { GradeSection } from "@/components/profile/GradeSection";
import { AgeSchoolSection } from "@/components/profile/AgeSchoolSection";
import { ChipsSection } from "@/components/profile/ChipsSection";
import { CareerSection } from "@/components/profile/CareerSection";

/**
 * Источник истины для интересов и предметов: пара { value, labelKey }.
 * value хранится в БД на русском (исторически), labelKey — для отображения.
 * При добавлении нового пункта правится только этот файл.
 */
const INTERESTS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "Программирование", labelKey: "interests.programming" },
  { value: "Математика", labelKey: "interests.math" },
  { value: "Физика", labelKey: "interests.physics" },
  { value: "Химия", labelKey: "interests.chemistry" },
  { value: "Биология", labelKey: "interests.biology" },
  { value: "История", labelKey: "interests.history" },
  { value: "Литература", labelKey: "interests.literature" },
  { value: "Искусство", labelKey: "interests.art" },
  { value: "Музыка", labelKey: "interests.music" },
  { value: "Спорт", labelKey: "interests.sports" },
];

const SUBJECTS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "Математика", labelKey: "subjects.math" },
  { value: "Информатика", labelKey: "subjects.informatics" },
  { value: "Физика", labelKey: "subjects.physics" },
  { value: "Химия", labelKey: "subjects.chemistry" },
  { value: "Биология", labelKey: "subjects.biology" },
  { value: "История", labelKey: "subjects.history" },
  { value: "География", labelKey: "subjects.geography" },
  { value: "Литература", labelKey: "subjects.literature" },
  { value: "Английский язык", labelKey: "subjects.english" },
  { value: "Узбекский язык", labelKey: "subjects.uzbek" },
];

function buildLabelMap(items: ReadonlyArray<{ value: string; labelKey: string }>) {
  const map: Record<string, string> = {};
  for (const item of items) map[item.value] = item.labelKey;
  return map;
}

const INTEREST_LABELS = buildLabelMap(INTERESTS);
const SUBJECT_LABELS = buildLabelMap(SUBJECTS);

function toOnboardingInput(student: StudentMe): OnboardingInput {
  return {
    grade: student.grade as Grade,
    age: student.age ?? undefined,
    schoolName: student.schoolName ?? undefined,
    interests: student.interests,
    favoriteSubjects: student.favoriteSubjects,
    targetProfession: student.targetProfession ?? undefined,
    careerDirection: student.careerDirection ?? undefined,
  };
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["student", "me"],
    queryFn: () => studentApi.me(),
  });
  const parentCodeQuery = useQuery({
    queryKey: ["student", "parent-link-code"],
    queryFn: () => studentApi.parentLinkCode(),
    enabled: !!query.data,
  });
  const [draft, setDraft] = useState<OnboardingInput | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (query.data && !draft) setDraft(toOnboardingInput(query.data));
  }, [query.data, draft]);

  const mutation = useMutation({
    mutationFn: (data: OnboardingInput) => studentApi.saveOnboarding(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["student", "me"], data);
      setDraft(toOnboardingInput(data));
      setSavedAt(new Date().toLocaleTimeString());
    },
  });

  if (query.isLoading || !draft) return <LoadingState label={t("profile.loading")} />;
  if (query.error) return <ErrorState message={(query.error as Error).message} />;

  const grade = parseInt(draft.grade.replace("G", ""), 10);
  const requiresCareer = grade >= 7;

  function toggleArrayValue(arr: string[], value: string) {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  }

  return (
    <>
      <PageHeader
        title={t("profile.profileTitle")}
        description={t("profile.profileDesc")}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="size-5 text-emerald-600" />
              Код для родителя
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-neutral-500">
              Передайте этот код родителю. Он введёт его в родительской панели и увидит ваш прогресс.
            </p>
            <div className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-2 text-xs font-semibold text-neutral-900">
                {parentCodeQuery.isLoading
                  ? "Генерируем код..."
                  : parentCodeQuery.data?.code ?? "Код недоступен"}
              </code>
              <Button
                variant="outline"
                disabled={!parentCodeQuery.data?.code}
                onClick={() => {
                  if (parentCodeQuery.data?.code) {
                    void navigator.clipboard?.writeText(parentCodeQuery.data.code);
                  }
                }}
              >
                <ClipboardDocumentIcon className="size-4" />
                Скопировать
              </Button>
            </div>
            {parentCodeQuery.data?.expiresAt && (
              <p className="mt-3 text-xs text-neutral-500">
                Действует до {new Date(parentCodeQuery.data.expiresAt).toLocaleString()}
              </p>
            )}
            {parentCodeQuery.error && (
              <p className="mt-3 text-sm text-[#e92554]">
                {(parentCodeQuery.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        <GradeSection
          grade={draft.grade}
          onChange={(g) => setDraft({ ...draft, grade: g })}
        />
        <AgeSchoolSection
          age={draft.age}
          schoolName={draft.schoolName}
          onAgeChange={(age) => setDraft({ ...draft, age })}
          onSchoolChange={(schoolName) => setDraft({ ...draft, schoolName })}
        />
        <ChipsSection
          title={t("profile.interestsTitle")}
          description={t("profile.interestsDesc")}
          options={INTERESTS.map((i) => i.value)}
          selected={draft.interests}
          onChange={(value) =>
            setDraft({ ...draft, interests: toggleArrayValue(draft.interests, value) })
          }
          renderOption={(value) => t(INTEREST_LABELS[value] || value)}
        />
        <ChipsSection
          title={t("profile.subjectsTitle")}
          description={t("profile.subjectsDesc")}
          options={SUBJECTS.map((s) => s.value)}
          selected={draft.favoriteSubjects}
          onChange={(value) =>
            setDraft({
              ...draft,
              favoriteSubjects: toggleArrayValue(draft.favoriteSubjects, value),
            })
          }
          renderOption={(value) => t(SUBJECT_LABELS[value] || value)}
        />
        {requiresCareer && (
          <CareerSection
            value={draft.careerDirection}
            onChange={(careerDirection) => setDraft({ ...draft, careerDirection })}
          />
        )}
      </div>

      <div className="sticky bottom-4 mt-2 flex items-center justify-end gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 backdrop-blur">
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <CheckCircleIcon className="size-4" />{" "}
            {t("profile.savedAt", { time: savedAt })}
          </span>
        )}
        {mutation.error && (
          <span className="text-sm text-[#e92554]">
            {(mutation.error as Error).message}
          </span>
        )}
        <Button
          variant="outline"
          onClick={() => query.data && setDraft(toOnboardingInput(query.data))}
          disabled={mutation.isPending}
        >
          {t("common.cancel")}
        </Button>
        <Button
          onClick={() => draft && mutation.mutate(draft)}
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Spinner className="text-white" />}
          {mutation.isPending ? t("profile.saving") : t("common.save")}
        </Button>
      </div>
    </>
  );
}
