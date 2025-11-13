import { IsArray, IsEmail, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';

export class EmailDto {
	@IsEmail({}, { message: 'Invalid email format' })
	email: string;
}

export class LoginDto {
	@IsEmail({}, { message: 'Invalid email format' })
	email: string;

	// @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
	// 	message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
	// })
	// @MinLength(6)
	password: string;

	@IsString()
	fcmToken: string
}

export class SignUpDto {
	@IsString()
	name: string;

	@IsEmail({}, { message: 'Invalid email format' })
	email: string;

	@IsString()
	first_name: string;

	@IsString()
	last_name: string;

	// Validates phone numbers (you can pass a locale like 'US', 'KE', etc.)
	@IsPhoneNumber(undefined, { message: 'Invalid phone number' })
	phone_number: string;

	// Password must be at least 8 characters, contain uppercase, lowercase, number, and special char
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
		message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
	})
	password: string;
}

export class PhoneNumbersDto {
	@IsArray()
	phoneNumbers: string[]
}

//POST_SERVICE
export class PostDto {
	@IsString()
	text: string;

	pictureFile: string[]
}