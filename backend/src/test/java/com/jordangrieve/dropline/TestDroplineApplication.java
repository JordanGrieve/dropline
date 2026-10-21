package com.jordangrieve.dropline;

import org.springframework.boot.SpringApplication;

public class TestDroplineApplication {

	public static void main(String[] args) {
		SpringApplication.from(DroplineApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
