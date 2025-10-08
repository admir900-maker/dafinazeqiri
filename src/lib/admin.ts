import { auth, clerkClient } from '@clerk/nextjs/server';

export async function isUserAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata?.role === 'admin';
  } catch {
    return false;
  }
}

export async function makeUserAdmin(userId: string) {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'admin'
      }
    });
    return true;
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
}

export async function removeAdminRole(userId: string) {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'user'
      }
    });
    return true;
  } catch (error) {
    console.error('Error removing admin role:', error);
    return false;
  }
}