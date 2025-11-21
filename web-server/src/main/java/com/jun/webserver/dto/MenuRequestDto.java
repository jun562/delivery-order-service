package com.jun.webserver.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MenuRequestDto {
    private String name;
    private int price;
    private String description;
}
