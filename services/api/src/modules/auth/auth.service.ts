import bcrypt from "bcryptjs";
import type { PrismaClient } from "@edtech/db";
import type { LoginInput, RegisterInput } from "@edtech/types";

const USER_INCLUDE = {
  profile: true,
  studentProfile: true,
  parentProfile: true,
} as const;

export async function registerUser(prisma: PrismaClient, data: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("User already exists");
  }

  if (data.role === "STUDENT" && !data.grade) {
    throw new Error("Grade is required for student registration");
  }
  if (data.role === "STUDENT" && !data.schoolName?.trim()) {
    throw new Error("School is required for student registration");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      profile: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          language: data.language,
        },
      },
      ...(data.role === "STUDENT" && data.grade
        ? {
            studentProfile: {
              create: {
                grade: data.grade,
                schoolName: data.schoolName || undefined,
                interests: [],
              },
            },
          }
        : {}),
      ...(data.role === "PARENT"
        ? {
            parentProfile: {
              create: {},
            },
          }
        : {}),
    },
    include: USER_INCLUDE,
  });

  // Не отдаём наружу passwordHash.
  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}

type UserWithRegistrationParts = {
  role: string;
  profile?: { firstName: string; lastName: string } | null;
  studentProfile?: { grade: unknown; schoolName?: string | null } | null;
  parentProfile?: unknown | null;
};

export function isRegistrationComplete(user: UserWithRegistrationParts | null) {
  if (!user?.profile?.firstName?.trim() || !user.profile.lastName?.trim()) {
    return false;
  }

  if (user.role === "STUDENT") {
    return Boolean(user.studentProfile?.grade && user.studentProfile.schoolName?.trim());
  }

  if (user.role === "PARENT") {
    return Boolean(user.parentProfile);
  }

  return true;
}

export async function completeGoogleRegistration(
  prisma: PrismaClient,
  data: RegisterInput,
) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    include: USER_INCLUDE,
  });

  if (!existing) {
    return registerUser(prisma, data);
  }

  if (isRegistrationComplete(existing)) {
    throw new Error("User already exists");
  }

  if (data.role === "STUDENT" && !data.grade) {
    throw new Error("Grade is required for student registration");
  }
  if (data.role === "STUDENT" && !data.schoolName?.trim()) {
    throw new Error("School is required for student registration");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      passwordHash,
      role: data.role,
      profile: {
        upsert: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            language: data.language,
          },
          update: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            language: data.language,
          },
        },
      },
      ...(data.role === "STUDENT" && data.grade
        ? {
            studentProfile: {
              upsert: {
                create: {
                  grade: data.grade,
                  schoolName: data.schoolName || undefined,
                  interests: [],
                },
                update: {
                  grade: data.grade,
                  schoolName: data.schoolName || undefined,
                },
              },
            },
          }
        : {}),
      ...(data.role === "PARENT"
        ? {
            parentProfile: {
              upsert: {
                create: {},
                update: {},
              },
            },
          }
        : {}),
    },
    include: USER_INCLUDE,
  });

  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}

export async function loginUser(prisma: PrismaClient, data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: USER_INCLUDE,
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const { passwordHash: _omit, ...safeUser } = user;
  return safeUser;
}
