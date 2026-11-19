# Security Specification - ChowkDirect

## Data Invariants
1. A **User** profile must belong to the authenticated user (UID match).
2. **Jobs** must be created by a Customer.
3. **Bookings** must involve a Customer and a Worker who exist.
4. **Chats** must only be accessible by their participants.
5. **Snapshots/Listings** must always be filtered by ownership or participation.

## The Dirty Dozen Payloads (Attack Vectors)
1. **Identity Spoofing**: User A trying to create a profile for User B.
2. **Role Escalation**: Customer trying to set their role to 'admin'.
3. **Job Hijacking**: User B trying to edit User A's job.
4. **Shadow Booking**: Creating a booking for a worker without their consent.
5. **Chat Peeking**: Reading messages in a chat the user is not part of.
6. **Admin Bypass**: Trying to seed data with a spoofed email (not verified).
7. **Status Skip**: Moving a booking from 'pending' directly to 'completed'.
8. **Resource Poisoning**: IDs longer than 128 characters.
9. **PII Leak**: Accessing other users' private info (phone/email).
10. **Orphaned Writes**: Creating a booking for a non-existent worker.
11. **Cost Attack**: Creating 10,000 jobs in a batch.
12. **OTP Stealth**: Changing booking status to 'in-progress' without providing the secret OTP.

## Test Cases (Expected)
- `users/{otherUid}` Read/Write -> DENIED.
- `jobs` List where `customerId != uid` -> DENIED.
- `chats/{chatId}` Read where `uid not in participants` -> DENIED.
- `bookings/{id}` Update status to 'completed' without being participant -> DENIED.
