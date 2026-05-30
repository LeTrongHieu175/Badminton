jest.mock('../src/repositories/user.repository', () => ({
  findByIdWithAuth: jest.fn(),
  updateUser: jest.fn(),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  countByRole: jest.fn()
}));

jest.mock('../src/utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn()
}));

const userService = require('../src/services/user.service');
const userRepository = require('../src/repositories/user.repository');
const { hashPassword } = require('../src/utils/password');

describe('user.service reset password', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('resetUserPassword hashes and stores the new password for existing user', async () => {
    userRepository.findByIdWithAuth.mockResolvedValue({
      id: 5,
      username: 'player5',
      full_name: 'Player Five',
      phone: '0900000005',
      email: 'player5@example.com',
      password_hash: 'old-hash',
      role: 'user',
      is_active: true,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z'
    });
    hashPassword.mockResolvedValue('new-hash');
    userRepository.updateUser.mockResolvedValue({
      id: 5,
      username: 'player5',
      full_name: 'Player Five',
      phone: '0900000005',
      email: 'player5@example.com',
      role: 'user',
      is_active: true,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-30T00:00:00.000Z'
    });

    const result = await userService.resetUserPassword({ id: 1, role: 'admin' }, 5, 'temp123');

    expect(hashPassword).toHaveBeenCalledWith('temp123');
    expect(userRepository.updateUser).toHaveBeenCalledWith(5, { passwordHash: 'new-hash' });
    expect(result).toEqual(
      expect.objectContaining({
        id: 5,
        username: 'player5',
        email: 'player5@example.com'
      })
    );
  });

  test('resetUserPassword rejects passwords shorter than 6 characters', async () => {
    userRepository.findByIdWithAuth.mockResolvedValue({
      id: 5,
      username: 'player5',
      role: 'user',
      is_active: true
    });

    await expect(userService.resetUserPassword({ id: 1, role: 'admin' }, 5, '123')).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userRepository.updateUser).not.toHaveBeenCalled();
  });
});
