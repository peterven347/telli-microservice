import { IsArray, IsEmail, IsPhoneNumber, IsString, Matches, MinLength } from 'class-validator';

export class EmailDto {
	@IsEmail({}, { message: 'Invalid email format' })
	email!: string;
}

export class LoginDto {
	@IsEmail({}, { message: 'Invalid email format' })
	email!: string;

	password!: string;

	@IsString()
	fcmToken!: string;
}

export class SignUpDto {
	@IsEmail({}, { message: 'Invalid email format' })
	email!: string;

	@IsString()
	user_name!: string;

	@IsPhoneNumber(undefined, { message: 'Invalid phone number' })
	phone_number!: string;

	@IsString()
	publicKey!: string;

	// @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
	// 	message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character \n',
	// })
	password!: string;
}

export class PhoneNumbersDto {
	@IsArray()
	phoneNumbers!: string[];
}

//POST_SERVICE
export class PostDto {
	@IsString()
	text!: string;

	// pictureFile!: string[];
}